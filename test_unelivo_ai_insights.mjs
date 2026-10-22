// UNELIVO AI insights: tenant isolation, KVKK data minimisation, roles, config and quota.
import assert from 'node:assert/strict';
import { createInsightsHandler } from './server/handlers/ai/insights.js';
import { computeSalonMetrics, computePlatformMetrics } from './server/insights-metrics.js';

let passed = 0;
const check = (ok, message) => { assert.ok(ok, message); passed++; };
const today = '2026-10-22';

const appointments = {
  a1: { businessId: 'biz_a', customerUid: 'cust_secret_1', customerName: 'Ayşe Gizli', customerPhone: '5551112233', date: today, time: '10:00', status: 'completed', servicePriceSnapshot: 300, serviceNameSnapshot: 'Kesim', staffNameSnapshot: 'Ali' },
  a2: { businessId: 'biz_a', customerUid: 'cust_secret_1', customerName: 'Ayşe Gizli', customerPhone: '5551112233', date: '2026-10-20', time: '14:00', status: 'completed', servicePriceSnapshot: 500, serviceNameSnapshot: 'Boya', staffNameSnapshot: 'Ali' },
  a3: { businessId: 'biz_a', customerUid: 'cust_secret_2', customerName: 'Mehmet Gizli', customerPhone: '5559998877', date: '2026-10-21', time: '14:30', status: 'no_show', servicePriceSnapshot: 300, serviceNameSnapshot: 'Kesim', staffNameSnapshot: 'Veli' },
  a4: { businessId: 'biz_a', customerUid: 'cust_secret_3', date: '2026-10-25', time: '11:00', status: 'approved', servicePriceSnapshot: 300, serviceNameSnapshot: 'Kesim', staffNameSnapshot: 'Veli' },
  b1: { businessId: 'biz_b', customerUid: 'other_salon_customer', customerName: 'Başka Salon', date: today, time: '09:00', status: 'completed', servicePriceSnapshot: 9999, serviceNameSnapshot: 'Gizli Hizmet' }
};
const businesses = { biz_a: { name: 'Salon A', ownerUid: 'owner_a', status: 'active', city: 'İstanbul', services: { s: { active: true } }, staff: { x: { active: true } } }, biz_b: { name: 'Salon B', ownerUid: 'owner_b', status: 'suspended', city: 'istanbul' } };
const users = { owner_a: { role: 'owner', phone: '5550000000', name: 'Patron A' }, c: { role: 'customer', phone: '5551112233' }, admin: { role: 'super_admin' } };

// Pure metrics
const salon = computeSalonMetrics(businesses.biz_a, Object.fromEntries(Object.entries(appointments).filter(([, a]) => a.businessId === 'biz_a')), today);
check(salon.last30Days.revenueTL === 800 && salon.todaySummary.revenueTL === 300, 'revenue counts completed appointments only');
check(salon.last30Days.noShow === 1 && salon.next7DaysBooked === 1, 'no-show and upcoming counts');
check(salon.customers30Days.distinct === 2 && salon.customers30Days.returning === 1, 'returning customers counted without exposing ids');
const salonJson = JSON.stringify(salon);
check(!/cust_secret|Gizli|5551112233|5559998877/.test(salonJson), 'salon metrics contain no customer ids, names or phones');
const platform = computePlatformMetrics({ businesses, users, appointments, applications: { x: { status: 'pending' } } }, today);
check(platform.salons.total === 2 && platform.salons.suspended === 1 && platform.applications.pending === 1, 'platform totals');
check(platform.topCities.length === 1 && platform.topCities[0].value === 1, 'cities are case-folded and suspended salons excluded');
check(!/cust_secret|Gizli|5551112233|5550000000|Patron A/.test(JSON.stringify(platform)), 'platform metrics contain no personal data');

// Handler with an in-memory database
const data = { appointments, businesses, users, salon_applications: {} };
const db = { ref(path) { let field, value; const node = () => path.split('/').reduce((v, k) => v?.[k], data); return { orderByChild(f) { field = f; return this; }, equalTo(v) { value = v; return this; }, get: async () => { let v = node(); if (field && v) v = Object.fromEntries(Object.entries(v).filter(([, a]) => a?.[field] === value)); return { val: () => structuredClone(v ?? null) }; } }; } };
let seen = [], quotaCalls = 0;
const options = { database: () => db, answer: async input => { seen.push(input); return 'Yanıt'; }, quota: async () => { quotaCalls++; }, enabled: () => true, modelReady: () => true, clock: () => ({ date: today }) };
const handler = createInsightsHandler(options);
const call = async (auth, body, fn = handler) => { let status, result; await fn({ method: 'POST', auth, body }, { setHeader() {}, status(v) { status = v; return this; }, json(v) { result = v; } }); return { status, result }; };
const owner = { uid: 'owner_a', profile: { role: 'owner', businessId: 'biz_a' } };

check((await call(owner, { action: 'status' })).result.configured === true, 'status reports configured');
const ok = await call(owner, { action: 'ask', question: 'Bu ay ciro nasıl?' });
check(ok.status === 200 && ok.result.message === 'Yanıt' && quotaCalls === 1, 'owner gets an answer and quota is reserved');
const sent = JSON.stringify(seen.at(-1));
check(sent.includes('Salon A') && !/biz_b|Gizli Hizmet|9999|Salon B/.test(sent), 'owner model input contains only their own salon');
check(!/cust_secret|Ayşe|Mehmet|5551112233/.test(sent), 'owner model input contains no customer personal data');
check((await call(owner, { action: 'ask', question: 'ciro', businessId: 'biz_b' })).status === 403, 'owner cannot target another salon via body');
check((await call({ uid: 'impostor', profile: { role: 'owner', businessId: 'biz_a' } }, { action: 'ask', question: 'ciro?' })).status === 403, 'profile pointing at a salon you do not own is rejected');
for (const role of ['customer', 'barber', 'manager', 'receptionist']) check((await call({ uid: 'u', profile: { role, businessId: 'biz_a' } }, { action: 'ask', question: 'ciro?' })).status === 403, `${role} cannot use business insights`);
check((await call(null, { action: 'ask', question: 'x?' })).status === 401, 'anonymous rejected');
check((await call(owner, { action: 'ask', question: 'x' })).status === 400, 'too-short question rejected');
check((await call(owner, { action: 'ask', question: 'ciro?' }, createInsightsHandler({ ...options, enabled: () => false }))).status === 503, 'disabled config returns 503');
const limited = await call(owner, { action: 'ask', question: 'ciro?' }, createInsightsHandler({ ...options, quota: async () => { throw Object.assign(Error('Asistan kullanım sınırına ulaşıldı.'), { statusCode: 429 }); } }));
check(limited.status === 429, 'quota limit is enforced');
const admin = await call({ uid: 'admin', profile: { role: 'super_admin' } }, { action: 'ask', question: 'Platform nasıl?' });
const adminSent = JSON.stringify(seen.at(-1));
check(admin.status === 200 && seen.at(-1).metrics.scope === 'platform' && !/cust_secret|Ayşe|5551112233|5550000000/.test(adminSent), 'super admin gets platform totals without personal data');
const crashed = await call(owner, { action: 'ask', question: 'ciro?' }, createInsightsHandler({ ...options, answer: async () => { throw Error('provider down'); } }));
check(crashed.status === 503 && !/provider down/.test(crashed.result.error), 'provider errors are not leaked');

console.log(`UNELIVO AI INSIGHTS: ${passed}/${passed} PASS`);
