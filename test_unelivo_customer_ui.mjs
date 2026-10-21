// Customer UI regressions found in the 22 Oct 2026 preview review.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { uniquePlaceNames } from './src/salon-discovery.js';
import { brandingStyle, contrast } from './src/brand-colors.js';

let passed = 0;
const check = (ok, message) => { assert.ok(ok, message); passed++; };

const css = fs.readFileSync('src/styles/app.css', 'utf8') + fs.readFileSync('src/styles/unelivo.css', 'utf8');
const customer = fs.readFileSync('src/ui/customer.js', 'utf8');
const navRule = css.match(/\.customer-panel \.bottom-nav \{[^}]*\}/)?.[0] || '';
const navItems = (customer.match(/<nav class="bottom-nav customer-bottom-nav">([\s\S]*?)<\/nav>/)?.[1].match(/class="nav-item/g) || []).length;
check(navItems === 4, 'customer bottom nav has 4 items');
check(!/grid-template-columns:repeat\(\d/.test(navRule) && /grid-auto-flow:column/.test(navRule), 'customer bottom nav columns follow the item count (no empty column)');

const ownerLocale = fs.readFileSync('src/locales/owner.js', 'utf8');
check(ownerLocale.includes("['dk','min','мин','دقيقة','min','دقیقه'],") && !ownerLocale.includes("['dk)'"), 'duration unit has no stray parenthesis');
for (const file of ['src/ui/customer.js', 'src/ui/owner.js']) {
  const source = fs.readFileSync(file, 'utf8');
  for (const use of source.matchAll(/\(\$\{[^}]+\} \$\{t\('ownerUi_109'\)\}(.)/g)) check(use[1] === ')', `${file}: opened duration parenthesis is closed`);
}

check(JSON.stringify(uniquePlaceNames(['istanbul', 'İstanbul', 'BAHÇELİEVLER', 'bahçelievler', ' Şişli ', ''])) === JSON.stringify(['Bahçelievler', 'İstanbul', 'Şişli']), 'city/district options are de-duplicated case-insensitively in Turkish');

for (const mode of ['light', 'dark']) {
  const vars = Object.fromEntries(brandingStyle({ primary: '#d9ad42', mode }).split(';').filter(Boolean).map(p => p.split(':')));
  check(contrast(vars['--salon-success'], vars['--salon-bg']) >= 4.5, `salon ${mode}: "open today" text is readable`);
  check(contrast(vars['--salon-danger'], vars['--salon-bg']) >= 4.5, `salon ${mode}: "closed" text is readable`);
}
check(customer.includes('<div class="public-storefront-page animate-fade" style="${brandingStyle('), 'public storefront page carries the salon colours, not only the inner card');

for (const surface of ['#242424', '#192338']) check(contrast('#f87171', surface) >= 4.5, `dark danger text readable on ${surface}`);
check(/:root\[data-theme="dark"\] \{--theme-copy-ef4444:#f87171;\}/.test(css), 'dark palettes remap danger text');
check(customer.includes('background: #dc2626; color: #fff;') && contrast('#dc2626', '#ffffff') >= 4.5, 'notification counter is readable');
check(/customer-appointment-filters \{display:grid!important/.test(css) && /customer-appointment-filters \.btn \{[^}]*word-break:keep-all/.test(css) && customer.includes('class="customer-appointment-filters" style="display:grid;grid-template-columns:1fr 1fr;'), 'appointment filters use a 2x2 grid without splitting words');

console.log(`UNELIVO CUSTOMER UI: ${passed}/${passed} PASS`);
