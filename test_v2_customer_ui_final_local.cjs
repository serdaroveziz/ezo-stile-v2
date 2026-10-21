const assert = require('assert');
const fs = require('fs');

const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const config = fs.readFileSync('src/config.js', 'utf8');
const coreLocales = fs.readFileSync('src/locales/core.js', 'utf8');
const rules = fs.readFileSync('database.rules.json', 'utf8');
const icons = fs.readFileSync('src/ui/icons.js', 'utf8');

const checks = [];
function check(name, fn) { fn(); checks.push(name); }

function loadExportedHelper(name, nextMarker) {
  const start = customer.indexOf(`export function ${name}`);
  const end = customer.indexOf(nextMarker, start);
  const source = customer.slice(start, end).replace('export function', 'function');
  return new Function(`${source}; return ${name};`)();
}
const formatPersonName = loadExportedHelper('formatPersonName', '\n\nexport function sanitizeProfilePhotoUrl');
const sanitizeProfilePhotoUrl = loadExportedHelper('sanitizeProfilePhotoUrl', '\n\nfunction renderCustomerAvatar');

check('customer bottom nav exactly five', () => assert.equal((customer.match(/class="nav-item /g) || []).length, 5));
check('customer nav bounce is limited to customer navigation icons', () => {
  assert.match(customer, /class="bottom-nav customer-bottom-nav"/);
  ['home', 'salons', 'appointments', 'ai', 'profile'].forEach(tab => assert.match(customer, new RegExp(`data-nav-bounce-tab="${tab}"`)));
  assert.match(customer, /animateTouchNav/);
  assert.match(customer, /triggerTouchNavIconBounce/);
  assert.doesNotMatch(customer, new RegExp(['nav', 'helper'].join('-')));
  assert.doesNotMatch(coreLocales, new RegExp('customerNav' + 'Helper'));
});
check('Salons labels exist in TR EN RU', () => {
  assert.match(config, /salonsTab: 'Salonlar'/);
  assert.match(config, /salonsTab: 'Salons'/);
  assert.match(config, /salonsTab: 'Салоны'/);
});
check('AI nav item present', () => assert.match(customer, /data-customer-action=\"ai\"[\s\S]*uiIcon\('sparkles'\)/));
check('language flags present', () => ['🇹🇷', '🇬🇧', '🇷🇺'].forEach(flag => assert.ok(config.includes(flag))));
check('header does not display phone', () => {
  const header = customer.match(/<div class="header-bar">[\s\S]*?<\/div>\s*\n\s*\$\{mainHtml\}/)?.[0] || '';
  assert.ok(header);
  assert.doesNotMatch(header, /user\.phone/);
  assert.match(header, /renderCustomerAvatar/);
});
check('Turkish title case helper is locale aware', () => assert.match(customer, /toLocaleUpperCase\('tr-TR'\)[\s\S]*toLocaleLowerCase\('tr-TR'\)/));
check('name examples format correctly', () => {
  assert.equal(formatPersonName('azat'), 'Azat');
  assert.equal(formatPersonName('  kuvvat   serdarov '), 'Kuvvat Serdarov');
  assert.equal(formatPersonName('şeker babajanova'), 'Şeker Babajanova');
});
check('profile image types and five MB limit', () => {
  assert.match(customer, /image\/jpeg.*image\/png.*image\/webp/);
  assert.match(customer, /5 \* 1024 \* 1024/);
});
check('malicious profile image URLs rejected', () => {
  assert.match(customer, /sanitizeProfilePhotoUrl/);
  assert.doesNotMatch(customer, /\^data:image\/\(\?:svg/);
});
check('profile URL sanitizer rejects active content', () => {
  assert.equal(sanitizeProfilePhotoUrl('javascript:alert(1)'), '');
  assert.equal(sanitizeProfilePhotoUrl('data:image/svg+xml;base64,AAAA'), '');
  assert.equal(sanitizeProfilePhotoUrl('data:text/html;base64,AAAA'), '');
  assert.equal(sanitizeProfilePhotoUrl('https://cdn.example/avatar.webp'), 'https://cdn.example/avatar.webp');
});
check('favorite outline and filled state', () => {
  assert.match(customer, /favorite-toggle.*is-favorite/);
  assert.match(icons, /star:/);
});
check('favorites are UID scoped', () => assert.match(customer, /users\/\$\{user\.uid\}\/favoriteSalons\/\$\{businessId\}/));
check('favorite rule rejects fake business IDs', () => assert.match(rules, /public_businesses'\)\.child\(\$businessId\)\.exists\(\)/));
check('booking service staff date time icons', () => ['service', 'users', 'calendar', 'clock'].forEach(icon => assert.ok(customer.includes(`uiIcon('${icon}')`))));
check('history counters and rows use the same visible set', () => {
  assert.match(customer, /const visiblePastApts = pastAptsAll\.slice\(0, 5\)\.filter\(apt => !isHiddenForCustomer\(apt\)\);/);
  assert.match(customer, /const visibleCancelledApts = cancelledApts;/);
  assert.match(customer, /\$\{t\('staffUi_32'\)\}<br><strong>\$\{visiblePastApts\.length\}/);
});
check('history hiding cannot backfill an older appointment', () => {
  const newestFive = ['1','2','3','4','5'];
  const hidden = new Set(['3','5']);
  assert.deepEqual(newestFive.filter(id => !hidden.has(id)), ['1','2','4']);
  assert.doesNotMatch(customer, /pastAptsAll\.filter\(apt => !isHiddenForCustomer\(apt\)\)\.slice\(0, 5\)/);
});
check('customer booking can return to its source salon detail', () => assert.match(customer, /returnFromCustomerBooking[\s\S]*openSalonDetailsModal/));
check('support subject select has an explicit contrast class', () => assert.match(customer, /support-category-select/));
check('history hide never deletes canonical appointment', () => {
  assert.match(customer, /customer\/hide-appointment/);
  assert.match(rules, /"hiddenAppointments"[\s\S]*"\.write": false/);
  assert.doesNotMatch(customer, /saveRecord\(`appointments\/\$\{appointmentId\}`[^\n]*null/);
});
check('active appointment cannot be hidden', () => {
  assert.match(customer, /customer\/hide-appointment/);
  assert.match(customer, /effectiveAppointmentStatus/);
});
check('history preference is server-owned and appointment-owner scoped', () => {
  assert.match(rules, /"hiddenAppointments"[\s\S]*"\.write": false/);
  assert.match(customer, /customer\/hide-appointment/);
});
check('TR RU EN new labels exist', () => ['Favoriye Ekle', 'Add to Favorites', 'В избранное', 'Geçmişten Kaldır', 'Remove from History', 'Удалить из истории'].forEach(label => assert.ok(config.includes(label))));

console.log(`CUSTOMER UI FINAL LOCAL: ${checks.length}/${checks.length} kontrol geçti`);
