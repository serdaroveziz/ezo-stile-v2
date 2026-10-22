const assert = require('assert');
const fs = require('fs');

const css = fs.readFileSync('src/styles/app.css', 'utf8');
const panels = ['customer.js', 'owner.js', 'staff.js', 'super-admin.js']
  .map(file => fs.readFileSync(`src/ui/${file}`, 'utf8'));
const navBounce = fs.readFileSync('src/ui/nav-bounce.js', 'utf8');

assert.match(css, /html\s*\{[^}]*scroll-behavior:\s*smooth/m, 'native smooth scroll eksik');
assert(!/wheel|touchmove|scroll-snap-type/.test(css), 'scroll hijacking benzeri kural olmamalı');
assert.match(css, /--motion-normal:\s*220ms/, 'ortak normal motion token eksik');
assert.match(css, /--motion-distance:\s*8px/, 'ortak motion mesafesi eksik');
assert.match(css, /@keyframes ezo-content-enter\{from\{opacity:0;transform:translate3d\(0,var\(--motion-distance\),0\)/, 'hafif content reveal eksik');
assert.match(css, /\.animate-fade\{animation:ezo-content-enter/, 'mevcut ortak reveal sınıfı bağlı değil');
assert.match(css, /\.modal-overlay>\.modal-card[^}]*ezo-modal-enter/, 'merkez modal geçişi eksik');
assert.match(css, /@media\(hover:hover\) and \(pointer:fine\)/, 'hover yalnız uygun cihazlara sınırlandırılmalı');
assert.match(css, /\.nav-item\.active \.icon,.staff-nav-item\.is-active>/, 'aktif bottom navigation geri bildirimi eksik');
assert.match(css, /\.btn:not\(\[disabled\]\):active/, 'disabled butonlar motion almamalı');
assert.match(css, /@keyframes ezo-nav-icon-bounce/, 'ortak nav ikon bounce animasyonu eksik');
assert.match(css, /\.bottom-nav \.nav-item:hover \.nav-bounce-icon,.staff-bottom-nav \.staff-nav-item:hover \.nav-bounce-icon/, 'masaüstü ortak hover bounce eksik');
assert.match(css, /\.nav-icon-bounce\{animation:ezo-nav-icon-bounce/, 'dokunma ortak bounce sınıfı eksik');
assert.equal((css.match(/@keyframes ezo-nav-icon-bounce/g) || []).length, 1, 'yalnız tek ortak nav bounce keyframe olmalı');
assert.match(navBounce, /animationend/, 'dokunma bounce sınıfı animasyon sonunda temizlenmeli');
assert.doesNotMatch(navBounce, /mousemove|requestAnimationFrame|setInterval|scroll/, 'nav bounce sürekli olay/döngü kullanmamalı');
for (const panel of panels) {
  assert.match(panel, /triggerTouchNavIconBounce/, 'her ana panel ortak dokunma helperını kullanmalı');
  assert.match(panel, /data-nav-bounce-tab/, 'her ana panelde nav icon hedefi işaretlenmeli');
}
assert.doesNotMatch(css, new RegExp(['nav', 'helper'].join('-')), 'yardımcı balon CSS’i kaldırılmış olmalı');
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/, 'reduced-motion desteği eksik');
assert.match(css, /scroll-behavior:auto!important/, 'reduced-motion smooth scroll kapatmalı');
assert(!/IntersectionObserver|requestAnimationFrame|setInterval/.test(css), 'motion CSS sürekli JS döngüsü içermemeli');
for (const panel of panels) assert(panel.includes('animate-fade'), 'panel ortak motion sınıfını kullanmalı');
assert.match(css, /@media\(max-width:600px\)\{\.modal-overlay\{align-items:center;justify-content:center/, 'mobil modal merkezleme korunmalı');
assert.match(css, /overflow-x:hidden/, 'yatay taşma koruması bulunmalı');

console.log('MOTION SYSTEM LOCAL: PASS (360/390/430/tablet/desktop CSS sözleşmesi)');
