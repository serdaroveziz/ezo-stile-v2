const provinceDataUrl = new URL('./data/turkey/provinces.json', import.meta.url);
let provincePromise;
const provinceCache = new Map();

export function normalizeTurkeyLocationName(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function loadTurkeyProvinces() {
  if (!provincePromise) provincePromise = fetch(provinceDataUrl).then(response => {
    if (!response.ok) throw new Error('Türkiye il listesi yüklenemedi.');
    return response.json();
  });
  return provincePromise;
}

export function findTurkeyLocation(items, name) {
  const target = normalizeTurkeyLocationName(name);
  return target ? (items || []).find(item => normalizeTurkeyLocationName(item && item.name) === target) || null : null;
}

export async function loadTurkeyProvince(provinceOrName) {
  const provinces = await loadTurkeyProvinces();
  const province = typeof provinceOrName === 'object' ? provinceOrName : findTurkeyLocation(provinces, provinceOrName);
  if (!province) return null;
  if (!provinceCache.has(province.plate)) {
    const url = new URL(`./data/turkey/locations/${province.file}`, import.meta.url);
    provinceCache.set(province.plate, fetch(url).then(response => {
      if (!response.ok) throw new Error('Seçilen ilin yerleşim bilgileri yüklenemedi.');
      return response.json();
    }));
  }
  return provinceCache.get(province.plate);
}

export function clearTurkeyAddressCacheForTests() {
  provincePromise = undefined;
  provinceCache.clear();
}
