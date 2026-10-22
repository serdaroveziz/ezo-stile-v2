const assert = require('node:assert/strict');
const fs = require('node:fs');

const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const icons = fs.readFileSync('src/ui/icons.js', 'utf8');

const coordinateSource = customer.match(/function normalizeCoordinate\(value, min, max\) \{[\s\S]*?\n\}/);
assert.ok(coordinateSource, 'coordinate normalizer exists');
const normalizeCoordinate = Function(`return (${coordinateSource[0]})`)();
assert.equal(normalizeCoordinate('', -90, 90), null);
assert.equal(normalizeCoordinate('   ', -180, 180), null);
assert.equal(normalizeCoordinate(true, -90, 90), null);
assert.equal(normalizeCoordinate('41.01', -90, 90), 41.01);
assert.match(customer, /!\(latitude === 0 && longitude === 0\)/);
assert.match(customer, /\[biz\.address,biz\.district,biz\.city\]\.filter\(Boolean\)\.join\(', '\)/);

assert.match(customer, /const visiblePastApts = pastAptsAll\.slice\(0, 5\);/);
assert.match(customer, /const visibleCancelledApts = cancelledApts;/);
assert.match(customer, /users\/\$\{user\.uid\}\/hiddenAppointments/);
assert.match(customer, /api\/customer\/hide-appointment/);

assert.match(customer, /welcomeSessionKey = `\$\{user\.uid\}:\$\{renderGeneration\}`/);
assert.match(customer, /setTimeout\([\s\S]*2400\)/);
assert.match(customer, /hero\.remove\(\)/);

for (const label of ['Pazartesi', 'Cuma', 'Monday', 'Friday', 'Понедельник', 'Пятница']) {
  assert.ok(customer.includes(label), `schedule label: ${label}`);
}

assert.match(customer, /24 \* 60 \* 60 \* 1000/);
assert.match(customer, /notificationSeen\.has\(key\)/);
assert.match(customer, /Europe\/Istanbul/);
assert.match(customer, /<\/button>\n    `\)\.join\(''\)/);

assert.match(customer, /uiIcon\('store'\)/);
assert.match(customer, /uiIcon\('styleAi'\)/);
assert.match(icons, /styleAi:/);
assert.match(icons, /store:/);

for (const category of ['Randevu Sorunu', 'Salonla İletişim', 'Hesap / Profil', 'Bildirim Sorunu', 'Teknik Sorun', 'Diğer']) {
  assert.ok(customer.includes(category), `support category: ${category}`);
}

console.log('customer tour part 1 local checks: PASS');
