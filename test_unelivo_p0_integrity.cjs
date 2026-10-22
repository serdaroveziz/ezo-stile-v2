/* UNELIVO 2.0 P0 — açılış bütünlüğü regresyon testi (bağımlılıksız). */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const MOJIBAKE = /Ã[\u0080-ÿ]|Ä[\u0080-ÿ]|Å[\u0080-ÿ]|â€|âœ/;
let checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks++; };

// 1. index.html: charset ilk 1024 bayt içinde, Türkçe karakterler bozuk değil.
const htmlBytes = fs.readFileSync(path.join(root, 'index.html'));
const charsetAt = htmlBytes.indexOf(Buffer.from('charset'));
check(charsetAt >= 0 && charsetAt < 1024, `<meta charset> ilk 1024 bayt içinde olmalı (şu an: ${charsetAt})`);
const html = htmlBytes.toString('utf8');
check(!MOJIBAKE.test(html), 'index.html içinde bozuk kodlanmış Türkçe metin (ör. "YÃ¼kleniyor") olmamalı');
check(html.includes('Yükleniyor') && html.includes('Güzellik'), 'açılış metinleri doğru Türkçe karakterlerle yazılmalı');

// 2. Hata kutusu yalnızca yerel ortamda çalışmalı; canlıda kullanıcıya ham hata gösterilmemeli.
const diag = html.match(/<script id="local-boot-diagnostic">([\s\S]*?)<\/script>/);
if (diag) {
  check(/location\.hostname/.test(diag[1]) && /localhost/.test(diag[1]) && /return;/.test(diag[1]), 'tanılama betiği localhost dışında hemen çıkmalı');
  check(html.indexOf('local-boot-diagnostic') > charsetAt, 'tanılama betiği <meta charset> sonrasına yerleşmeli');
}

// 3. Kaynak dosyalarda bozuk kodlama olmamalı.
const walk = dir => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
  const rel = path.join(dir, entry.name);
  if (entry.isDirectory()) return entry.name === 'vendor' || entry.name === 'data' ? [] : walk(rel);
  return /\.(js|css|json)$/.test(entry.name) ? [rel] : [];
});
const sources = [...walk('src'), ...walk('server'), 'api/index.js', 'sw.js', 'manifest.json'];
const broken = sources.filter(file => MOJIBAKE.test(read(file)));
check(broken.length === 0, 'bozuk kodlamalı kaynak dosyalar: ' + broken.join(', '));

// 4. Yedek/tanılama dosyaları Vercel'e yüklenmemeli.
const ignore = read('.vercelignore');
for (const pattern of ['*yedek*', 'local-boot-check.html', '.env*']) check(ignore.split(/\r?\n/).includes(pattern), `.vercelignore şunu içermeli: ${pattern}`);

console.log(`UNELIVO P0 INTEGRITY: ${checks}/${checks} PASS (${sources.length} kaynak dosya tarandı)`);
