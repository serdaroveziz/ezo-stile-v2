/*
 * Public discovery backfill. Default is dry-run and no network.
 * Local file: node scripts/backfill-public-businesses.mjs --input businesses.json
 * Live read-only preview: node scripts/backfill-public-businesses.mjs --live-source
 * Explicit write: add --apply --confirm-public-business-backfill
 */
import fs from 'node:fs/promises';
import { buildPublicBusiness, PUBLIC_BUSINESS_FORBIDDEN_FIELDS } from '../server/public-business.js';

const args = new Set(process.argv.slice(2));
const inputIndex = process.argv.indexOf('--input');
const inputFile = inputIndex >= 0 ? process.argv[inputIndex + 1] : null;
const apply = args.has('--apply');
const liveSource = args.has('--live-source');

if (apply && !args.has('--confirm-public-business-backfill')) {
  throw new Error('Yazma için --confirm-public-business-backfill zorunludur.');
}
if (!inputFile && !liveSource) {
  console.log('DRY RUN: Ağ bağlantısı kurulmadı. Yerel inceleme için --input businesses.json kullanın.');
  process.exit(0);
}

let businesses;
let database = null;
if (inputFile) {
  businesses = JSON.parse(await fs.readFile(inputFile, 'utf8'));
} else {
  const { getAdminDatabase } = await import('../server/firebase-admin.js');
  database = getAdminDatabase();
  const snapshot = await database.ref('businesses').get();
  businesses = snapshot.exists() ? snapshot.val() : {};
}

function containsForbiddenKey(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, child]) => PUBLIC_BUSINESS_FORBIDDEN_FIELDS.includes(key) || containsForbiddenKey(child));
}

const updates = {};
let publicCount = 0;
let hiddenCount = 0;
for (const [businessId, business] of Object.entries(businesses || {})) {
  const projection = buildPublicBusiness(businessId, business);
  if (projection && containsForbiddenKey(projection)) throw new Error(`${businessId}: yasaklı private alan projection içine sızdı.`);
  updates[`public_businesses/${businessId}`] = projection;
  if (projection) publicCount += 1;
  else hiddenCount += 1;
  console.log(`${projection ? 'PUBLIC' : 'HIDDEN'} ${businessId}${projection ? ` -> ${Object.keys(projection).join(', ')}` : ''}`);
}

console.log(`Kontrol tamamlandı: ${publicCount} PUBLIC, ${hiddenCount} HIDDEN; private alan sızıntısı yok.`);
if (!apply) {
  console.log('DRY RUN tamamlandı; Firebase verisi değiştirilmedi.');
  process.exit(0);
}
if (!database) {
  const { getAdminDatabase } = await import('../server/firebase-admin.js');
  database = getAdminDatabase();
}
await database.ref().update(updates);
console.log('public_businesses backfill tamamlandı.');
