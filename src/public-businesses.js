/* Public discovery identity helpers. Firebase node key is the authoritative businessId. */
export function normalizePublicBusinesses(records) {
  return Object.entries(records || {}).filter(([, business]) => business && typeof business === 'object').map(([businessId, business]) => ({
    ...business,
    businessId
  }));
}

export function normalizePublicSalonSlug(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR')
    .replace(/[çÇ]/g, 'c').replace(/[ğĞ]/g, 'g').replace(/[ıİI]/g, 'i')
    .replace(/[öÖ]/g, 'o').replace(/[şŞ]/g, 's').replace(/[üÜ]/g, 'u')
    .replace(/[äÄ]/g, 'a').replace(/[ňŇ]/g, 'n').replace(/[ýÝ]/g, 'y')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-').slice(0, 64);
}

function stableSlugSuffix(businessId) {
  let hash = 2166136261;
  for (const char of String(businessId || '')) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36).slice(0, 5).padStart(5, '0');
}

export function createPublicSalonSlug(name, businessId, existingSlug = '') {
  const suffix = stableSlugSuffix(businessId);
  const base = normalizePublicSalonSlug(existingSlug) || normalizePublicSalonSlug(name) || 'salon';
  return base.endsWith(`-${suffix}`) ? base : `${base}-${suffix}`;
}

export function resolvePublicBusinessBySlug(records, slug) {
  const normalized = normalizePublicSalonSlug(slug);
  if (!normalized) return null;
  return normalizePublicBusinesses(records).find(business =>
    createPublicSalonSlug(business.name, business.businessId, business.publicSlug) === normalized
  ) || null;
}

export function publicSalonPath(slug) {
  const normalized = normalizePublicSalonSlug(slug);
  return normalized ? `/salon/${encodeURIComponent(normalized)}` : '';
}
