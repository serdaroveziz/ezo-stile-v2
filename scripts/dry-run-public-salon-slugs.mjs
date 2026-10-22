/*
 * Migration-ready public_salon_slugs planner.
 * Default mode is local dry-run. It never connects to Firebase.
 * Usage: node scripts/dry-run-public-salon-slugs.mjs --input test-fixtures/public-salon-slugs.json
 * A future write must use both --apply and --confirm-public-salon-slug-backfill.
 */
import fs from 'node:fs/promises';
import { buildPublicBusiness } from '../server/public-business.js';
import { createPublicSalonSlug, normalizePublicSalonSlug } from '../src/public-businesses.js';

const args = new Set(process.argv.slice(2));
const inputIndex = process.argv.indexOf('--input');
const inputFile = inputIndex >= 0 ? process.argv[inputIndex + 1] : 'test-fixtures/public-salon-slugs.json';
const apply = args.has('--apply');
if (apply && !args.has('--confirm-public-salon-slug-backfill')) {
  throw new Error('Yazma için --confirm-public-salon-slug-backfill zorunludur.');
}

const source = JSON.parse(await fs.readFile(inputFile, 'utf8'));
const businesses = source.businesses || source;
const mappings = {};
const conflicts = [];
const canonicalByBusiness = {};
const publicBusinesses = [];

for (const [businessId, business] of Object.entries(businesses)) {
  const projection = buildPublicBusiness(businessId, business);
  if (!projection) continue;
  const slug = normalizePublicSalonSlug(projection.publicSlug || createPublicSalonSlug(business.name, businessId, business.publicSlug));
  if (!slug) { conflicts.push({ type: 'missing_slug', businessId }); continue; }
  publicBusinesses.push(businessId);
  canonicalByBusiness[businessId] = slug;
  if (mappings[slug] && mappings[slug] !== businessId) {
    conflicts.push({ type: 'duplicate_slug', slug, businessIds: [mappings[slug], businessId] });
  } else {
    mappings[slug] = businessId;
  }
}

const byBusiness = new Map();
for (const [slug, businessId] of Object.entries(mappings)) {
  const list = byBusiness.get(businessId) || [];
  list.push(slug); byBusiness.set(businessId, list);
}
for (const [businessId, slugs] of byBusiness) {
  if (slugs.length > 1) conflicts.push({ type: 'multiple_canonical_slugs', businessId, slugs });
}

console.log(JSON.stringify({
  mode: apply ? 'APPLY_REQUESTED' : 'DRY_RUN', inputFile,
  eligiblePublicBusinesses: publicBusinesses.length,
  mappingCount: Object.keys(mappings).length,
  mappings, canonicalByBusiness, conflicts,
  excluded: Object.keys(businesses).filter(id => !publicBusinesses.includes(id)),
  notes: [
    'Only status=active and discoveryEnabled=true enter the index.',
    'bookingEnabled=false remains indexable because it is still publicly discoverable; booking is disabled at the storefront.',
    'Existing publicSlug is normalized and preserved, so rename does not change a stable slug.',
    'Root public_businesses scan remains the route fallback until backfill and verification complete.'
  ]
}, null, 2));

if (conflicts.length) process.exitCode = 2;
if (!apply) console.log('DRY RUN tamamlandı; Firebase bağlantısı ve yazma yapılmadı.');
else console.log('APPLY iskeleti hazır; bu sürüm güvenli biçimde yalnızca plan üretir ve canlı yazma eklenmemiştir.');
