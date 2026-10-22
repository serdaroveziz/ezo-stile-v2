const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
  const css = fs.readFileSync('src/styles/app.css', 'utf8');
  const provinces = JSON.parse(fs.readFileSync('src/data/turkey/provinces.json', 'utf8'));
  assert.equal(provinces.length, 81, '81 gerçek il bulunmalı');
  assert.equal(new Set(provinces.map(item => item.name)).size, 81, 'il adları benzersiz olmalı');
  const nationalTotals = provinces.reduce((totals, province) => {
    const data = JSON.parse(fs.readFileSync(path.join('src/data/turkey/locations', province.file), 'utf8'));
    totals.districts += data.districts.length;
    totals.neighborhoods += data.districts.reduce((sum, district) => sum + district.neighborhoods.length, 0);
    return totals;
  }, { districts:0, neighborhoods:0 });
  assert.deepEqual(nationalTotals, { districts:973, neighborhoods:32158 }, 'yinelenen adlar temizlenmiş gerçek kapsam korunmalı');

  const istanbul = provinces.find(item => item.name === 'İstanbul');
  assert.ok(istanbul, 'İstanbul bulunmalı');
  const istanbulData = JSON.parse(fs.readFileSync(path.join('src/data/turkey/locations', istanbul.file), 'utf8'));
  const kadikoy = istanbulData.districts.find(item => item.name === 'KADIKÖY');
  assert.ok(kadikoy, 'İstanbul yalnız kendi ilçelerini sağlamalı');
  assert.ok(kadikoy.neighborhoods.includes('CAFERAĞA'), 'Kadıköy mahalleleri arasında Caferağa bulunmalı');
  assert.ok(!istanbulData.districts.some(item => item.name === 'ÇANKAYA'), 'başka ilin ilçesi İstanbul dosyasına karışmamalı');

  const originalFetch = global.fetch;
  const fetched = [];
  global.fetch = async url => {
    const pathname = decodeURIComponent(new URL(String(url)).pathname).replace(/^\//, '');
    const marker = 'src/data/turkey/';
    const relative = pathname.slice(pathname.indexOf(marker));
    fetched.push(relative);
    return { ok:true, json:async()=>JSON.parse(fs.readFileSync(relative, 'utf8')) };
  };
  const address = await import('./src/turkey-address.js');
  address.clearTurkeyAddressCacheForTests();
  const loadedProvinces = await address.loadTurkeyProvinces();
  assert.equal(fetched.length, 1, 'ilk aşamada yalnız il indeksi yüklenmeli');
  const loadedIstanbul = await address.loadTurkeyProvince(address.findTurkeyLocation(loadedProvinces, 'istanbul'));
  assert.equal(fetched.length, 2, 'il seçilince yalnız seçilen ilin dosyası yüklenmeli');
  await address.loadTurkeyProvince('İSTANBUL');
  assert.equal(fetched.length, 2, 'aynı il tekrar parse/yükleme yapmamalı');
  assert.equal(address.findTurkeyLocation(loadedIstanbul.districts, 'kadıköy').name, 'KADIKÖY');
  global.fetch = originalFetch;

  assert.match(owner, /changeOwnerSalonProvince[\s\S]*neighborhoodSelect\.innerHTML = '<option value="">Mahalle seçin<\/option>'/, 'il değişince ilçe/mahalle temizlenmeli');
  assert.match(owner, /changeOwnerSalonDistrict[\s\S]*neighborhoodSelect\.innerHTML = '<option value="">Mahalle seçin<\/option>'/, 'ilçe değişince mahalle temizlenmeli');
  assert.match(owner, /renderTurkeyLocationOptions\(provinces,bizRecord\.city/, 'kayıtlı il otomatik seçilmeli');
  assert.match(owner, /renderTurkeyLocationOptions\(districts,bizRecord\.district/, 'kayıtlı ilçe otomatik seçilmeli');
  assert.match(owner, /renderTurkeyLocationOptions\(neighborhoods,bizRecord\.neighborhood/, 'kayıtlı mahalle otomatik seçilmeli');
  assert.match(owner, /body:JSON\.stringify\(\{name,category,phone,address,city,district,neighborhood/, 'üç alan kayıt payloadında korunmalı');
  assert.match(owner, /\(mevcut kayıt\)/, 'eski veya artık listede olmayan kayıt korunmalı');
  assert.match(css, /owner-address-selects/, 'mobil select düzeni bulunmalı');
  assert.match(css, /grid-template-columns:1fr/, 'mobilde yatay taşma oluşturulmamalı');

  console.log('OWNER TURKEY ADDRESS LOCAL: 20/20 kontrol geçti');
})().catch(error => { console.error(error); process.exitCode = 1; });
