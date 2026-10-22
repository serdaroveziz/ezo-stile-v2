/* Discovery card identity/click contract. Local-only; never contacts Firebase. */
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const { normalizePublicBusinesses } = await import('./src/public-businesses.js');
  const salons = normalizePublicBusinesses({
    biz_one: { name: 'Salon Bir' },
    biz_two: { businessId: 'stale-id', name: 'Salon İki', services: { svc: { id: 'svc', name: 'Kesim' } } },
    biz_three: { businessId: null, name: 'Salon Üç' }
  });
  assert.deepEqual(salons.map(salon => salon.businessId), ['biz_one', 'biz_two', 'biz_three']);
  assert.deepEqual(salons.map(salon => salon.name), ['Salon Bir', 'Salon İki', 'Salon Üç']);
  assert.equal(salons[1].services.svc.name, 'Kesim');

  const source = fs.readFileSync('src/ui/customer.js', 'utf8');
  assert.match(source, /normalizePublicBusinesses\(allBusinessesData\)/);
  assert.match(source, /onclick="window\.openSalonDetailsModal\('\$\{b\.businessId\}'\)"/);
  assert.match(source, /event\.stopPropagation\(\);window\.beginNewBookingFromSalonById\('\$\{b\.businessId\}'\)/);
  assert.match(source, /fetchRecord\(`public_businesses\/\$\{businessId\}`\)/);
  assert.match(source, /customerBookingDraft\s*=\s*\{[\s\S]*?businessId:\s*businessId,[\s\S]*?businessName:\s*businessName/);
  assert.match(source, /cachedCurrentServices\s*=\s*bizData\.services/);

  console.log('Discovery card click contract: 12/12 PASS (3 salons, local, no network)');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
