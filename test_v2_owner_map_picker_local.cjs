const assert = require('assert');
const fs = require('fs');

const owner = fs.readFileSync('src/ui/owner.js', 'utf8');
const css = fs.readFileSync('src/styles/app.css', 'utf8');

function normalize(value, min, max) {
  if (value === null || value === undefined || typeof value === 'boolean') return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const number = Number(raw);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function validPoint(lat, lng) {
  lat = normalize(lat, -90, 90);
  lng = normalize(lng, -180, 180);
  return lat !== null && lng !== null && !(lat === 0 && lng === 0);
}

assert.strictEqual(normalize('', -90, 90), null);
assert.strictEqual(normalize('   ', -90, 90), null);
assert.strictEqual(normalize(false, -90, 90), null);
assert.strictEqual(normalize('91', -90, 90), null);
assert.strictEqual(normalize('41.0082', -90, 90), 41.0082);
assert.strictEqual(validPoint(0, 0), false);
assert.strictEqual(validPoint(41.0082, 28.9784), true);

assert(owner.includes("t('ownerUi_270')"));
assert(owner.includes("const startPoint = hasCurrentPoint ? [currentLat, currentLng] : [39, 35]"));
assert(owner.includes("ownerLocationMap.on('click'"));
assert(owner.includes("latitudeInput.value = String(ownerLocationDraft.latitude)"));
assert(owner.includes("window.cancelOwnerMapPicker = () => cleanupOwnerLocationMap()"));
assert(owner.includes("ownerLocationMap.off()") && owner.includes("ownerLocationMap.remove()"));
assert(owner.includes("if (leafletLoadPromise) return leafletLoadPromise"));
assert(owner.includes("./src/vendor/leaflet/leaflet.js"));
assert(owner.includes("normalizeOwnerMapCoordinate(position.coords.latitude"));
assert(!/confirmOwnerMapPicker[\s\S]{0,900}authenticatedFetch/.test(owner));
assert(css.includes('.owner-map-picker-layer{position:fixed'));
assert(css.includes('place-items:center'));
assert(css.includes('overflow-x:hidden'));
assert(css.includes('.owner-map-picker-actions{'));

console.log('PASS owner map picker local checks');
