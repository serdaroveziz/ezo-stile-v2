import { normalizeSalonTypes, salonTypeLabel } from '../src/salon-discovery.js';
import { normalizeBranding } from '../src/brand-colors.js';
/* Safe public discovery projection. Never copy fields outside this explicit allowlist. */
import { getAdminDatabase } from './firebase-admin.js';
import { createPublicSalonSlug, normalizePublicSalonSlug } from '../src/public-businesses.js';

function compactObject(value) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

export function sanitizePublicUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return undefined;
  try { const parsed = new URL(raw); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined; }
  catch { return undefined; }
}

function sanitizePublicImage(value) {
  const raw = String(value || '').trim();
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(raw)) return raw;
  return sanitizePublicUrl(raw);
}

function sanitizeCoordinate(value, min, max) {
  if (value === null || value === undefined || typeof value === 'boolean' || String(value).trim() === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : undefined;
}

function publicSocials(business) {
  const configured = business.socials || {};
  const instagramValue = configured.instagram || { value: business.instagram, active: Boolean(business.instagram) };
  const whatsappValue = configured.whatsapp || { value: business.whatsappPhone, active: Boolean(business.whatsappPhone) };
  const output = {};
  const web = item => item && item.active === true ? sanitizePublicUrl(item.value || item.url) : undefined;
  const instagram = web(instagramValue), tiktok = web(configured.tiktok), website = web(configured.website);
  const whatsappDigits = String((whatsappValue && (whatsappValue.value || whatsappValue.phone)) || '').replace(/\D/g, '');
  const whatsapp = whatsappValue && whatsappValue.active === true && /^(?:90)?5\d{9}$/.test(whatsappDigits) ? `https://wa.me/${whatsappDigits.startsWith('90') ? whatsappDigits : `90${whatsappDigits}`}` : undefined;
  if (instagram) output.instagram = instagram;
  if (whatsapp) output.whatsapp = whatsapp;
  if (tiktok) output.tiktok = tiktok;
  if (website) output.website = website;
  return output;
}

function publicServices(services) {
  return Object.fromEntries(Object.entries(services || {}).filter(([, service]) => service && service.active !== false).map(([key, service]) => [key, compactObject({
    id: service.id || service.serviceId || key,
    name: service.name || service.title || 'Hizmet',
    price: Number(service.price || 0),
    duration: Number(service.duration || service.durationMinutes || 30),
    active: true,
    category: service.category
  })]));
}

function publicStaff(staff) {
  return Object.fromEntries(Object.entries(staff || {}).filter(([, member]) => member && member.active !== false).map(([key, member]) => [key, compactObject({
    id: member.id || key,
    displayName: member.displayName || member.name || 'Uzman',
    name: member.name || member.displayName || 'Uzman',
    photoUrl: sanitizePublicImage(member.photoUrl || member.profileImageUrl),
    services: Array.isArray(member.services) ? member.services : ['all'],
    weeklySchedule: member.weeklySchedule,
    active: true
  })]));
}

export function isPubliclyDiscoverable(business) {
  return Boolean(business && business.status === 'active' && business.discoveryEnabled === true);
}

export function buildPublicBusiness(businessId, business) {
  if (!isPubliclyDiscoverable(business)) return null;
  const media = business.media || {};
  let latitude = sanitizeCoordinate(business.latitude, -90, 90);
  let longitude = sanitizeCoordinate(business.longitude, -180, 180);
  if (latitude === 0 && longitude === 0) { latitude = undefined; longitude = undefined; }
  return compactObject({
    businessId,
    publicSlug: createPublicSalonSlug(business.name, businessId, business.publicSlug),
    name: business.name || 'Salon',
    city: business.city || '',
    district: business.district || '',
    neighborhood: business.neighborhood || '',
    address: business.address || '',
    phone: business.publicPhoneEnabled === false ? undefined : (business.publicPhone || business.phone || ''),
    branding: business.branding ? normalizeBranding(business.branding) : undefined,
    logoUrl: sanitizePublicImage(media.logoUrl || business.logoUrl),
    photoUrl: sanitizePublicImage(business.photoUrl || business.profileImageUrl || media.profileImageUrl),
    coverPhoto: sanitizePublicImage(business.coverPhoto || business.coverImageUrl || media.coverImageUrl),
    media: compactObject({ profileImageUrl: sanitizePublicImage(media.profileImageUrl), coverImageUrl: sanitizePublicImage(media.coverImageUrl), gallery: Array.isArray(media.gallery) ? media.gallery.map(sanitizePublicImage).filter(Boolean) : [] }),
    services: publicServices(business.services),
    staff: publicStaff(business.staff),
    weeklySchedule: business.weeklySchedule || {},
    bookingEnabled: business.bookingEnabled !== false,
    discoveryEnabled: true,
    status: 'active',
    averageRating: Number(business.averageRating || 0),
    description: business.publicDescription || business.description || '',
    category: salonTypeLabel(business),
    salonTypes: normalizeSalonTypes(business.salonTypes),
    reviewCount: Number(business.reviewCount || business.ratingCount || 0),
    socials: publicSocials(business),
    latitude,
    longitude,
    updatedAt: new Date().toISOString()
  });
}

export async function syncPublicBusiness(businessId, business = null, database = getAdminDatabase()) {
  let source = business;
  if (!source) {
    const snapshot = await database.ref(`businesses/${businessId}`).get();
    source = snapshot.exists() ? snapshot.val() : null;
  }
  if (source && createPublicSalonSlug(source.name, businessId, source.publicSlug) !== normalizePublicSalonSlug(source.publicSlug)) {
    const generatedSlug = createPublicSalonSlug(source.name, businessId, source.publicSlug);
    const slugRef = database.ref(`businesses/${businessId}/publicSlug`);
    if (typeof slugRef.transaction === 'function') {
      const result = await slugRef.transaction(current => normalizePublicSalonSlug(current) || generatedSlug);
      source = { ...source, publicSlug: result.snapshot.val() || generatedSlug };
    } else {
      source = { ...source, publicSlug:generatedSlug };
    }
  }
  const projection = buildPublicBusiness(businessId, source);
  const ref = database.ref(`public_businesses/${businessId}`);
  if (!projection) {
    await ref.remove();
    return null;
  }
  await ref.set(projection);
  return projection;
}

export const PUBLIC_BUSINESS_FORBIDDEN_FIELDS = Object.freeze([
  'ownerUid', 'subscription', 'plan', 'planStatus', 'staffLimit', 'payments',
  'permissions', 'internalNotes', 'secret', 'token'
]);
