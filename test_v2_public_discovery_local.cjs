/* Public discovery projection tests. Local-only; never contacts Firebase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { buildPublicBusiness, isPubliclyDiscoverable, syncPublicBusiness, PUBLIC_BUSINESS_FORBIDDEN_FIELDS } = await import('./server/public-business.js');
  const privateBusiness = {
    businessId: 'biz_safe', name: 'Güvenli Salon', city: 'İstanbul', district: 'Şişli',
    address: 'Test Mahallesi', phone: '05551112233', ownerUid: 'owner-secret',
    subscription: { providerToken: 'secret' }, planStatus: 'active', staffLimit: 99,
    permissions: { admin: true }, internalNotes: 'private', discoveryEnabled: true,
    status: 'active', bookingEnabled: true, latitude: 41.01, longitude: 28.97,
    services: { svc_1: { id: 'svc_1', name: 'Saç Kesimi', price: 500, duration: 45, active: true, internalCost: 10 } },
    staff: { stf_1: { id: 'stf_1', userId: 'private-uid', displayName: 'Kuvvat', active: true, commissionPercent: 50, permissions: { owner: true } } }
  };
  const projection = buildPublicBusiness('biz_safe', privateBusiness);
  assert.equal(projection.businessId, 'biz_safe');
  assert.equal(projection.services.svc_1.price, 500);
  assert.equal(projection.staff.stf_1.displayName, 'Kuvvat');
  assert.equal(projection.staff.stf_1.userId, undefined);
  assert.equal(projection.staff.stf_1.commissionPercent, undefined);
  for (const field of PUBLIC_BUSINESS_FORBIDDEN_FIELDS) assert.equal(projection[field], undefined, `${field} public olmamalı`);
  const eligibilityCases = [
    ['active + discovery=true', { status: 'active', discoveryEnabled: true }, true],
    ['active + discovery=false', { status: 'active', discoveryEnabled: false }, false],
    ['suspended + discovery=true', { status: 'suspended', discoveryEnabled: true }, false],
    ['status undefined + discovery=true', { discoveryEnabled: true }, false],
    ['active + discovery undefined', { status: 'active' }, false],
    ['status ve discovery undefined', {}, false]
  ];
  for (const [label, business, expected] of eligibilityCases) {
    assert.equal(isPubliclyDiscoverable(business), expected, label);
    assert.equal(Boolean(buildPublicBusiness(`case_${label}`, business)), expected, label);
  }

  const writes = [];
  const fakeDatabase = { ref: path => ({
    set: async value => writes.push({ method: 'set', path, value }),
    remove: async () => writes.push({ method: 'remove', path })
  }) };
  await syncPublicBusiness('biz_safe', privateBusiness, fakeDatabase);
  await syncPublicBusiness('biz_suspended', { status: 'suspended', discoveryEnabled: true }, fakeDatabase);
  assert.deepEqual(writes.map(write => [write.method, write.path]), [
    ['set', 'public_businesses/biz_safe'],
    ['remove', 'public_businesses/biz_suspended']
  ]);

  const rules = JSON.parse(fs.readFileSync('database.rules.json', 'utf8')).rules;
  assert.equal(rules.public_businesses['.read'], true);
  assert.equal(rules.public_businesses['.write'], false);
  assert.notEqual(rules.businesses.$businessId['.read'], true);
  assert.match(rules.businesses['.read'], /auth != null/);
  assert.match(rules.businesses.$businessId['.read'], /auth != null/);

  const customerSource = fs.readFileSync('src/ui/customer.js', 'utf8');
  assert.doesNotMatch(customerSource, /fetchRecord\(['"`]businesses(?:\/|['"`])/);
  assert.match(customerSource, /fetchRecord\(['"`]public_businesses/);
  const bookingSource = fs.readFileSync('server/handlers/booking/create.js', 'utf8');
  assert.match(bookingSource, /db\.ref\(`businesses\/\$\{businessId\}`\)\.get\(\)/);
  assert.doesNotMatch(bookingSource, /public_businesses/);

  console.log('Public discovery security and compatibility: 26/26 PASS (local, no network)');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
