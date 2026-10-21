const assert = require('assert');
const fs = require('fs');
const path = require('path');

const uiDir = path.join(__dirname, 'src', 'ui');
const uiFiles = ['index.html', ...fs.readdirSync(uiDir)
  .filter(name => name.endsWith('.js') && name !== 'ai-consultant.js')
  .map(name => `src/ui/${name}`)];
const sources = Object.fromEntries(uiFiles.map(file => [file, fs.readFileSync(path.join(__dirname, file), 'utf8')]));
const combined = Object.values(sources).join('\n');
const css = fs.readFileSync(path.join(__dirname, 'src', 'styles', 'app.css'), 'utf8');

assert.equal((combined.match(/\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}\uFE0F]/gu) || []).length, 0, 'AI dışındaki UI legacy emoji içermemeli');
for (const file of ['src/ui/customer.js', 'src/ui/owner.js', 'src/ui/staff.js', 'src/ui/super-admin.js', 'src/ui/portal.js']) {
  assert.match(sources[file], /(?:uiIcon|staffIcon)\(/, `${file} ortak SVG ikon helper kullanmalı`);
}
assert.equal((sources['src/ui/customer.js'].match(/class="nav-item /g) || []).length, 5, 'customer alt nav tam 5 öğe olmalı');
assert.ok((sources['src/ui/owner.js'].match(/class="nav-item /g) || []).length <= 5, 'owner alt nav en fazla 5 öğe olmalı');
assert.ok((sources['src/ui/super-admin.js'].match(/class="nav-item /g) || []).length <= 5, 'admin alt nav en fazla 5 öğe olmalı');
assert.ok((sources['src/ui/staff.js'].match(/staff-nav-item/g) || []).length >= 1, 'staff ortak nav sistemi korunmalı');
assert.match(sources['index.html'], /authoritativeRoute === 'owner' && getPortalMode\(\) === 'customer'/, 'owner dual-mode yalnız doğrulanmış owner için olmalı');
assert.doesNotMatch(sources['index.html'], /authoritativeRoute === 'staff'[\s\S]{0,120}getPortalMode/, 'staff portal tercihiyle başka panele geçmemeli');
assert.match(sources['src/ui/customer.js'], /user\.role === 'owner' && user\.portalMode === 'customer'/, 'owner customer modu açıkça sınırlandırılmalı');
assert.match(css, /env\(safe-area-inset-bottom\)/, 'bottom nav safe-area desteklemeli');
assert.match(css, /overflow-x:\s*hidden/, 'global yatay taşma kapalı olmalı');
assert.match(css, /@media \(max-width:359px\)/, 'küçük mobil breakpoint olmalı');
assert.match(css, /@media \(min-width:768px\)/, 'tablet/desktop breakpoint olmalı');
assert.match(css, /max-height:\s*90vh/, 'modal yüksekliği sınırlandırılmalı');
assert.match(css, /focus-visible/, 'klavye focus görünürlüğü olmalı');
assert.doesNotMatch(sources['index.html'], />Build:\s*v/i, 'kullanıcıya build etiketi gösterilmemeli');
assert.doesNotMatch(combined, /<button[^>]*>\s*<\/button>/g, 'boş icon-only button kalmamalı');
const iconButtons = combined.match(/<button[^>]*class="[^"]*icon-button[^"]*"[^>]*>/g) || [];
assert.ok(iconButtons.length > 0 && iconButtons.every(button => /aria-label=/.test(button)), 'icon-only düğmeler aria-label taşımalı');

console.log('GLOBAL UI CONTRACT LOCAL: 21/21 kontrol geçti');
