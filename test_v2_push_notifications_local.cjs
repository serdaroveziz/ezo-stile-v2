const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function fakeDatabase(initial = {}) {
  const data = JSON.parse(JSON.stringify(initial));
  const parts = value => String(value).split('/').filter(Boolean);
  const get = value => parts(value).reduce((node, key) => node && node[key], data);
  const parent = value => {
    const keys = parts(value); let node = data;
    for (const key of keys.slice(0, -1)) node = node[key] ||= {};
    return [node, keys[keys.length - 1]];
  };
  return { data, ref(value) { return {
    async get() { const valueAtPath = get(value); return { val:() => valueAtPath == null ? null : valueAtPath }; },
    async remove() { const [node,key] = parent(value); delete node[key]; },
    async set(next) { const [node,key] = parent(value); node[key] = next; },
    async update(patch) { const [node,key] = parent(value); node[key] = { ...(node[key] || {}), ...patch }; },
    async transaction(updater) { const [node,key] = parent(value); const next = updater(node[key] == null ? null : node[key]); if (next === undefined) return { committed:false }; node[key] = next; return { committed:true }; }
  }; } };
}

(async () => {
  const push = await import(pathToFileURL(path.join(root, 'server/push-notifications.js')).href);
  const pushNavigation = await import(pathToFileURL(path.join(root, 'src/push-navigation.js')).href);
  const authConfig = await import(pathToFileURL(path.join(root, 'server/handlers/auth/config.js')).href);
  const reminder = await import(pathToFileURL(path.join(root, 'server/handlers/notifications/check-reminders.js')).href);
  const tokenStore = await import(pathToFileURL(path.join(root, 'server/handlers/notifications/push-token.js')).href);
  const now = Date.parse('2026-09-06T09:00:00+03:00');
  const appointment = { aptId:'apt-1', status:'approved', date:'2026-09-06', time:'12:00' };
  assert.equal(push.reminderEligibility(appointment, now, 180), true, '3h reminder eligible');
  assert.equal(push.reminderEligibility({ ...appointment, time:'09:30' }, now, 30), true, '30m reminder eligible');
  for (const status of ['completed','cancelled','rejected','no_show']) assert.equal(push.reminderEligibility({ ...appointment, status }, now, 180), false, `${status} excluded`);

  const claimDb = fakeDatabase();
  assert.equal(await reminder.claimReminder('apt-1', 'reminder3hSent', claimDb), true);
  assert.equal(await reminder.claimReminder('apt-1', 'reminder3hSent', claimDb), false, '3h claim idempotent');
  assert.equal(await reminder.claimReminder('apt-1', 'reminder30mSent', claimDb), true);
  assert.equal(await reminder.claimReminder('apt-1', 'reminder30mSent', claimDb), false, '30m claim idempotent');

  const db = fakeDatabase({ users:{ u1:{ notificationPreferences:{ inApp:true, push:true }, pushTokens:{ good:{ token:'token-good' }, bad:{ token:'token-bad' } } } } });
  const messaging = { async sendEachForMulticast(message) {
    assert.deepEqual(message.tokens, ['token-good','token-bad']);
    assert.equal(message.notification, undefined, 'background worker owns one native notification');
    assert.equal(message.data.title, 'Test');
    assert.equal(message.data.body, 'Body');
    assert.match(message.data.link, /^\/?\?notification=1/);
    return { successCount:1, failureCount:1, responses:[{ success:true },{ success:false, error:{ code:'messaging/registration-token-not-registered' } }] };
  } };
  const result = await push.sendPushToUser('u1', { eventId:'event-1', title:'Test', message:'Body', appointmentId:'apt-1' }, { database:db, messaging });
  assert.equal(result.sent, 1);
  assert.equal(db.data.users.u1.pushTokens.bad, undefined, 'invalid token cleaned');
  assert.equal((await push.sendPushToUser('u1', { eventId:'event-1', title:'Test', message:'Body' }, { database:db, messaging })).skipped, 'duplicate');
  db.data.users.u1.notificationPreferences.inApp = false;
  assert.equal((await push.sendPushToUser('u1', { eventId:'event-2', title:'Test', message:'Body' }, { database:db, messaging })).skipped, 'preference_off');
  assert.equal(push.buildPushLink({ appointmentId:'apt-1', targetTab:'appointments', link:'https://outside.example' }), '/?notification=1&appointmentId=apt-1&targetTab=appointments', 'server never forwards arbitrary push links');

  const storage = new Map();
  const sessionStorage = { setItem:(k,v) => storage.set(k,v), getItem:k => storage.get(k) || null, removeItem:k => storage.delete(k) };
  assert.deepEqual(pushNavigation.savePushNavigation('?notification=1&appointmentId=apt_1&targetTab=appointments', sessionStorage), { appointmentId:'apt_1', targetTab:'appointments' }, 'push click context is whitelisted');
  assert.deepEqual(pushNavigation.takePushNavigation(sessionStorage), { appointmentId:'apt_1', targetTab:'appointments' }, 'push click context survives login handoff');
  assert.equal(pushNavigation.parsePushNavigation('?notification=0&targetTab=appointments'), null, 'ordinary routes do not create push context');
  assert.deepEqual(pushNavigation.parsePushNavigation('?notification=1&targetTab=evil&businessId=../secret'), { targetTab:'notifications' }, 'unsafe query values are discarded');

  const configKeys = ['FIREBASE_WEB_API_KEY','FIREBASE_AUTH_DOMAIN','FIREBASE_DATABASE_URL','FIREBASE_PROJECT_ID','FIREBASE_APP_ID','FIREBASE_MESSAGING_SENDER_ID'];
  const savedConfigEnv = Object.fromEntries(configKeys.map(key => [key, process.env[key]]));
  Object.assign(process.env, { FIREBASE_WEB_API_KEY:'public-key', FIREBASE_AUTH_DOMAIN:'example.firebaseapp.com', FIREBASE_DATABASE_URL:'https://example.firebaseio.com', FIREBASE_PROJECT_ID:'example', FIREBASE_APP_ID:'1:web:example', FIREBASE_MESSAGING_SENDER_ID:'123' });
  const workerConfigResponse = { headers:{}, setHeader(k,v){ this.headers[k] = v; }, status(code){ this.statusCode = code; return this; }, send(value){ this.body = value; return this; }, json(value){ this.body = value; return this; } };
  await authConfig.default({ method:'GET', url:'/api/auth/config?format=service-worker' }, workerConfigResponse);
  assert.equal(workerConfigResponse.statusCode, 200, 'worker config responds successfully');
  assert.match(workerConfigResponse.headers['Content-Type'], /application\/javascript/, 'worker config is executable JavaScript');
  assert.match(workerConfigResponse.body, /self\.__EZO_FIREBASE_CONFIG__/, 'worker receives only public Firebase web config');
  delete process.env.FIREBASE_MESSAGING_SENDER_ID;
  const coreOnlyResponse = { headers:{}, setHeader(k,v){ this.headers[k] = v; }, status(code){ this.statusCode = code; return this; }, send(value){ this.body = value; return this; }, json(value){ this.body = value; return this; } };
  await authConfig.default({ method:'GET', url:'/api/auth/config' }, coreOnlyResponse);
  assert.equal(coreOnlyResponse.statusCode, 200, 'core Firebase/Auth config remains available without optional FCM sender ID');
  assert.equal(coreOnlyResponse.body.config.messagingSenderId, undefined, 'missing sender ID is not treated as an Auth error');
  const workerWithoutMessaging = { headers:{}, setHeader(k,v){ this.headers[k] = v; }, status(code){ this.statusCode = code; return this; }, send(value){ this.body = value; return this; }, json(value){ this.body = value; return this; } };
  await authConfig.default({ method:'GET', url:'/api/auth/config?format=service-worker' }, workerWithoutMessaging);
  assert.match(workerWithoutMessaging.body, /__EZO_FIREBASE_CONFIG__ = null/, 'worker skips FCM initialization without a sender ID');
  for (const key of configKeys) { if (savedConfigEnv[key] == null) delete process.env[key]; else process.env[key] = savedConfigEnv[key]; }

  const tokenDb = fakeDatabase();
  const token = 'fcm_' + 'x'.repeat(80);
  await tokenStore.updatePushToken({ uid:'u1', method:'POST', body:{ token }, database:tokenDb });
  await tokenStore.updatePushToken({ uid:'u1', method:'POST', body:{ token }, database:tokenDb });
  assert.equal(Object.keys(tokenDb.data.users.u1.pushTokens).length, 1, 'duplicate token remains one record');
  assert.equal(tokenDb.data.users.u2, undefined, 'request cannot register another UID');
  await tokenStore.updatePushToken({ uid:'u1', method:'DELETE', body:{ token }, database:tokenDb });
  assert.equal(Object.keys(tokenDb.data.users.u1.pushTokens).length, 0, 'logout token lifecycle removes token');
  await assert.rejects(() => tokenStore.updatePushToken({ uid:'u1', method:'POST', body:{ token:'short' }, database:tokenDb }), /Geçersiz push token/);

  const client = read('src/push-notifications.js');
  const worker = read('sw.js');
  const router = read('api/index.js');
  const create = read('server/handlers/booking/create.js');
  const updateStatus = read('server/handlers/booking/update-status.js');
  const reschedule = read('server/handlers/booking/reschedule-approve.js');
  const publicBusiness = read('server/public-business.js');
  assert.match(client, /Notification\.requestPermission\(\)/, 'permission requested only by enable action');
  assert.match(client, /missing_fcm_config/, 'missing FCM settings disable only Push, gracefully');
  assert.match(client, /seenForeground\.has/, 'foreground duplicate guard');
  assert.match(client, /method:'DELETE'/, 'logout/token removal lifecycle');
  assert.match(worker, /firebase-messaging-compat/, 'background FCM worker SDK is loaded');
  assert.match(worker, /onBackgroundMessage/, 'background and closed-tab FCM handler is registered');
  assert.match(worker, /api\/auth\/config\?format=service-worker/, 'worker obtains public Firebase web config at runtime');
  assert.match(worker, /addEventListener\('notificationclick'/, 'notification click handler');
  assert.match(worker, /safeInternalLink/, 'notification click stays on the EZO application origin');
  assert.match(read('server/handlers/auth/config.js'), /format === 'service-worker'/, 'runtime service-worker config is available');
  assert.match(read('index.html'), /savePushNavigation/, 'click context is retained until the role screen is mounted');
  assert.match(read('index.html'), /register\('\/sw\.js\?v=[a-zA-Z0-9.-]+'\)/, 'worker uses root scope');
  assert.match(router, /requireAuth\(req\)/, 'token route protected by authenticated router');
  assert.match(router, /req\.headers\.authorization !== `Bearer \$\{cronSecret\}`/, 'reminder endpoint keeps CRON_SECRET authorization');
  assert.match(create, /sendNotification\(\{ targetUid:customerUid, type:'appointment_created'/, 'customer booking-created lifecycle push');
  assert.match(create, /\.catch\(error => console\.error\('Customer notification failed:'/, 'push failure cannot roll back booking success');
  for (const lifecycleType of ['apt_approved','apt_rejected','apt_cancelled']) assert.ok(updateStatus.includes(lifecycleType), `${lifecycleType} lifecycle notification`);
  assert.match(reschedule, /reschedule_request/, 'owner reschedule request notification');
  assert.match(reschedule, /reschedule_applied/, 'customer reschedule result notification');
  assert.match(updateStatus, /cancel_request/, 'owner cancel request notification');
  assert.ok(!/pushTokens|push_delivery_events/.test(publicBusiness), 'public projection does not expose push data');
  console.log('PASS push notification local regression');
})().catch(error => { console.error(error); process.exitCode = 1; });
