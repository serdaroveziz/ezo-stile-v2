// Offline integration: real ESM router, auth, review handlers and public projection.
// Only Firebase SDK I/O is replaced. No credentials or network are used.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { registerHooks } = require('node:module');
const clone = value => value == null ? null : structuredClone(value);
const snapshot = value => ({ exists: () => value != null, val: () => clone(value) });
const missingIndex = 'Index not defined, add ".indexOn": "businessId", for path "/reviews", to the rules';
let queryError = null;
let data;
let writes = 0;
let fallbackReads = 0;
function validate(value) {
  assert.notEqual(value, undefined, 'Firebase rejects undefined');
  if (typeof value === 'number') assert(Number.isFinite(value));
  if (value && typeof value === 'object') for (const [key, child] of Object.entries(value)) {
    assert(!/[.#$\[\]/]/.test(key), 'invalid Firebase key');
    validate(child);
  }
}
function ref(path, field, match) {
  const get = () => path.split('/').reduce((v, k) => v?.[k], data);
  const set = value => {
    validate(value); writes++;
    const parts = path.split('/'); const key = parts.pop();
    const parent = parts.reduce((v, k) => v[k] ||= {}, data);
    parent[key] = clone(value);
  };
  return {
    orderByChild(value) { return ref(path, value, match); },
    equalTo(value) { return ref(path, field, value); },
    async get() {
      if (path === 'reviews' && field && queryError) throw new Error(queryError);
      if (path === 'reviews' && !field) fallbackReads++;
      const value = get();
      return snapshot(field ? Object.fromEntries(Object.entries(value || {}).filter(([, v]) => v?.[field] === match)) : value);
    },
    on(event, listener) { return listener; },
    off() {},
    async once() { return this.get(); },
    async transaction(fn) {
      const value = fn(clone(get()));
      if (value === undefined) return { committed: false, snapshot: snapshot(get()) };
      set(value); return { committed: true, snapshot: snapshot(value) };
    },
    async update(value) { set({ ...get(), ...value }); },
    async set(value) { set(value); },
    async remove() { set(null); }
  };
}
globalThis.__reviewSdk = {
  database: { ref },
  auth: { async verifyIdToken(token, checkRevoked) {
    assert.equal(checkRevoked, true);
    if (!['customer_a', 'customer_b'].includes(token)) throw Object.assign(new Error('invalid token'), {code:'auth/invalid-id-token'});
    return { uid: token };
  } }
};
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('firebase-admin/')) return { url: `review-test:${specifier}`, shortCircuit: true };
    return next(specifier, context);
  },
  load(url, context, next) {
    if (!url.startsWith('review-test:')) return next(url, context);
    return { format: 'module', shortCircuit: true, source: `
      export const getApps = () => [{}];
      export const applicationDefault = () => { throw Error('No credentials allowed'); };
      export const cert = applicationDefault;
      export const initializeApp = applicationDefault;
      export const getAuth = () => globalThis.__reviewSdk.auth;
      export const getDatabase = () => globalThis.__reviewSdk.database;
      export const getMessaging = () => { throw Error('No messaging allowed'); };
    ` };
  }
});
globalThis.fetch = async () => { throw new Error('Network prohibited in this test'); };
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
(async () => {
  const router = (await import('./api/index.js')).default;
  const call = async (path, body, token = 'customer_a', method = 'POST') => {
    const res = response();
    await router({ url: `/api/${path}?path=`, method, headers: token ? { authorization: `Bearer ${token}` } : {}, body: clone(body) }, res);
    return res;
  };
  const source = fs.readFileSync('src/ui/customer.js', 'utf8');
  const start = source.indexOf('window.submitSharedSalonReview = async () => {');
  const end = source.indexOf('\n  };', start) + 5;
  const state = { model: { businessId: 'biz_x', business: {} }, reviewEligibility: { mode: 'create', appointmentId: 'apt_a' }, reviewComposerMode: 'create', reviewDraftRating: 5, reviewDraftComment: 'Çok iyi' };
  let submitted, refreshed;
  const context = { window: {}, salonDetailState: state, t: v => v,
    authenticatedFetch: async (url, init) => {
      assert.equal(init.method, 'POST'); assert.equal(init.headers['Content-Type'], 'application/json');
      submitted = { url, body: JSON.parse(init.body) };
      const result = await call(url.slice(5), submitted.body);
      return { ok: result.code === 200, json: async () => result.body };
    },
    renderSharedSalonDetail: async () => { refreshed = await call('reviews/public-list', { businessId: 'biz_x', limit: 5, offset: 0 }); },
    showErrorModal: (...args) => { throw Error(args.join(':')); }, showSuccessModal: () => {}
  };
  data = { users: { customer_a: { role: 'customer' }, customer_b: { role: 'customer' } }, appointments: { apt_a: { businessId: 'biz_x', customerUid: 'customer_a', customerName: 'Ayşe Yılmaz', status: 'completed' } }, reviews: {}, businesses: { biz_x: { name: 'Salon X', status: 'active', discoveryEnabled: true, ownerUid: 'private' } }, public_businesses: { biz_x: {} } };
  vm.runInNewContext(source.slice(start, end), context);
  queryError = missingIndex;
  await context.window.submitSharedSalonReview();
  assert.deepEqual(submitted.body, { businessId: 'biz_x', appointmentId: 'apt_a', rating: 5, comment: 'Çok iyi', mode: 'create' });
  assert.equal(data.reviews.rev_apt_a.comment, 'Çok iyi', 'submit commits before refresh');
  assert.equal(refreshed.code, 200, 'Preview regression: missing businessId index must not break refresh after successful submit');
  assert.equal(refreshed.body.reviews[0].customerName, 'Ayşe Y.');
  assert.equal(data.public_businesses.biz_x.reviewCount, 1, 'real public projection refreshed');
  assert.equal(data.public_businesses.biz_x.ownerUid, undefined);
  const body = submitted.body;
  const check = async (expected, patch = {}, token = 'customer_a', method = 'POST') => {
    const before = writes;
    const result = await call('reviews/submit', { ...body, ...patch }, token, method);
    assert.equal(result.code, expected, JSON.stringify(result.body));
    if (expected !== 200) assert.equal(writes, before, 'rejection must not write');
    return result;
  };
  data.appointments.apt_limit={...data.appointments.apt_a,serviceId:'canonical-service',serviceName:'Canonical service'};
  await check(400,{appointmentId:'apt_limit',comment:'x'.repeat(2001)});
  await check(400,{appointmentId:'apt_limit',comment:' '+ 'x'.repeat(2000)});
  await check(200,{appointmentId:'apt_limit',comment:'x'.repeat(2000),businessId:'biz_x',serviceId:'forged-service'});
  assert.equal(data.reviews.rev_apt_limit.comment.length,2000);
  assert.equal(data.reviews.rev_apt_limit.appointmentId,'apt_limit');
  assert.equal(data.reviews.rev_apt_limit.businessId,'biz_x');
  assert(!JSON.stringify(data.reviews.rev_apt_limit).includes('forged-service'));
  delete data.reviews.rev_apt_limit;
  delete data.appointments.apt_limit;
  await check(409); // duplicate create
  await check(403, {}, 'customer_b');
  await check(403, { customerUid: 'customer_b' });
  await check(403, { businessId: 'biz_y' });
  await check(401, {}, null);
  await check(401, {}, 'invalid');
  await check(405, {}, 'customer_a', 'GET');
  await check(400, { mode: 'invalid' });
  await check(400, { rating: 6 });
  data.appointments.apt_a.status = 'approved'; await check(409);
  data.appointments.apt_a.status = 'completed';
  await check(200, { mode: 'edit', rating: 4, comment: 'Düzenlendi' });
  data.reviews.rev_apt_a.createdAt = new Date(Date.now() - 48 * 3600000 - 1000).toISOString();
  await check(409, { mode: 'edit' });
  data.reviews.other = { businessId: 'biz_y', appointmentId: 'apt_other', customerUid: 'customer_b', customerName: 'Private Tenant', rating: 1, comment: 'OTHER TENANT SECRET' };
  const guest = await call('reviews/public-list', { businessId: 'biz_x' }, null);
  assert.equal(guest.code, 200); assert.equal(guest.body.reviewEligibility.mode, 'none');
  assert.equal(guest.body.reviews.length, 1);
  assert(!JSON.stringify(guest.body).includes('OTHER TENANT SECRET'));
  assert(!JSON.stringify(guest.body.reviews).includes('customerUid'));
  assert.equal((await call('reviews/public-list', { businessId: 'biz_x' }, 'invalid')).code, 401);
  assert.equal((await call('reviews/public-list', { businessId: 'biz_x' }, 'customer_b')).body.eligibleAppointments.length, 0);
  queryError = null;
  const before = fallbackReads;
  assert.equal((await call('reviews/public-list', { businessId: 'biz_x' })).code, 200);
  assert.equal(fallbackReads, before, 'indexed path should not scan');
  queryError = 'Permission denied';
  assert.equal((await call('reviews/public-list', { businessId: 'biz_x' })).code, 500);
  assert.equal(fallbackReads, before, 'other database errors must not use fallback');
  console.log('REVIEW API CONTRACT: PASS (real frontend payload, ESM router/auth/handlers/projection; offline SDK boundary)');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { hooks.deregister(); delete globalThis.__reviewSdk; });
