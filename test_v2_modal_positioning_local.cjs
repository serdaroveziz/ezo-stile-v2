const assert = require('assert');
const fs = require('fs');

const css = fs.readFileSync('src/styles/app.css', 'utf8');
const uiFiles = ['portal.js', 'customer.js', 'owner.js', 'staff-operations.js', 'super-admin.js', 'salon-application.js'];

assert(/\.modal-overlay\s*\{[\s\S]*?inset:\s*0;[\s\S]*?align-items:\s*center;[\s\S]*?justify-content:\s*center;/m.test(css));
assert(!/\.modal-overlay\s*\{[^}]*align-items:\s*flex-end/m.test(css));
assert(css.includes('max-height: calc(100dvh - 32px - env(safe-area-inset-top) - env(safe-area-inset-bottom))'));
assert(/\.modal-card\s*\{[^}]*overflow-y:\s*auto;[^}]*overflow-x:\s*hidden;/m.test(css));
assert(css.includes('body:has(#modal-root .modal-overlay){overflow:hidden}'));
assert(css.includes('.modal-card>div:first-child:has(>button[aria-label="Kapat"]){position:sticky'));
assert(css.includes('@media(max-width:600px){.modal-overlay{align-items:center;justify-content:center'));

for (const filename of uiFiles) {
  const source = fs.readFileSync(`src/ui/${filename}`, 'utf8');
  assert(source.includes('modal-overlay'), `${filename}: ortak modal yapısı bulunamadı`);
}

console.log('MODAL POSITIONING LOCAL: PASS (360/390/430/tablet/desktop ortak CSS sözleşmesi)');
