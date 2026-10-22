import { validateSalonTypes } from '../../../src/salon-discovery.js';
import { normalizeBranding } from '../../../src/brand-colors.js';
import { getAdminDatabase } from '../../firebase-admin.js';
import { syncPublicBusiness, sanitizePublicUrl } from '../../public-business.js';
import { createPublicSalonSlug } from '../../../src/public-businesses.js';

const IMAGE_RE = /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i;
const cleanText = (value, max) => String(value == null ? '' : value).trim().slice(0, max);
export const validCoordinate = (value, min, max) => value === '' || value == null || (typeof value !== 'boolean' && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= min && Number(value) <= max);

function normalizeSocials(input) {
  const result = {};
  for (const key of ['instagram', 'tiktok', 'website']) {
    const item = input && input[key] || {};
    const value = cleanText(item.value, 500);
    if (value && !sanitizePublicUrl(value)) throw Object.assign(new Error(`${key} bağlantısı güvenli bir http/https adresi olmalıdır.`), { statusCode:400 });
    result[key] = { value, active: item.active === true && Boolean(value) };
  }
  const whatsappItem = input && input.whatsapp || {};
  const digits = cleanText(whatsappItem.value, 30).replace(/\D/g, '');
  if (digits && !/^(?:90)?5\d{9}$/.test(digits)) throw Object.assign(new Error('WhatsApp numarası geçersiz.'), { statusCode:400 });
  result.whatsapp = { value: digits, active: whatsappItem.active === true && Boolean(digits) };
  return result;
}

function validateMedia(media) {
  if (!media) return undefined;
  const validate = value => {
    if (!value) return undefined;
    if (String(value).length > 2_000_000 || !IMAGE_RE.test(String(value))) throw Object.assign(new Error('Yalnız JPEG, PNG veya WebP görseller kabul edilir.'), { statusCode:400 });
    return String(value);
  };
  return {
    logoUrl: validate(media.logoUrl),
    profileImageUrl: validate(media.profileImageUrl),
    coverImageUrl: validate(media.coverImageUrl),
    gallery: Array.isArray(media.gallery) ? media.gallery.slice(0, 12).map(validate).filter(Boolean) : undefined
  };
}

export function isVerifiedBusinessOwner(profile, business, uid) {
  return Boolean(profile && business && uid && profile.role === 'owner' && profile.businessId && business.ownerUid === uid);
}

export async function handleSalonProfileWithDatabase(req, res, db) {
  if (req.method !== 'POST') return res.status(405).json({ error:'Method Not Allowed' });
  try {
    const profile = req.auth && req.auth.profile;
    if (!profile || profile.role !== 'owner' || !profile.businessId) return res.status(403).json({ error:'Salon profili yalnız salon sahibine açıktır.' });
    const ref = db.ref(`businesses/${profile.businessId}`);
    const snapshot = await ref.get();
    const business = snapshot.exists() ? snapshot.val() : null;
    if (!isVerifiedBusinessOwner(profile, business, req.auth.uid)) return res.status(403).json({ error:'Bu salonu düzenleme yetkiniz yok.' });
    const body = req.body || {};
    if (!validCoordinate(body.latitude, -90, 90) || !validCoordinate(body.longitude, -180, 180)) return res.status(400).json({ error:'Konum koordinatları geçersiz.' });
    const nextCoordinate = (key, current) => {
      if (!Object.prototype.hasOwnProperty.call(body, key)) return current ?? null;
      return body[key] === '' || body[key] == null ? null : Number(body[key]);
    };
    let nextLatitude = nextCoordinate('latitude', business.latitude);
    let nextLongitude = nextCoordinate('longitude', business.longitude);
    if (nextLatitude === 0 && nextLongitude === 0) { nextLatitude = null; nextLongitude = null; }
    const typePatch=Object.hasOwn(body,'salonTypes')?{salonTypes:validateSalonTypes(body.salonTypes)}:{};
    const patch = {
      ...typePatch,
      publicSlug: createPublicSalonSlug(business.name || body.name, profile.businessId, business.publicSlug),
      name: cleanText(body.name ?? business.name, 120), category: cleanText(body.category ?? business.category, 80),
      phone: cleanText(body.phone ?? business.phone, 30),
      publicDescription: cleanText(body.publicDescription ?? business.publicDescription, 1500),
      address: cleanText(body.address ?? business.address, 300), city: cleanText(body.city ?? business.city, 80), district: cleanText(body.district ?? business.district, 80), neighborhood:cleanText(body.neighborhood ?? business.neighborhood, 120),
      latitude: nextLatitude,
      longitude: nextLongitude,
      socials: body.socials ? normalizeSocials(body.socials) : (business.socials || {}), updatedAt:new Date().toISOString()
    };
    if (patch.name.length < 2 || !patch.phone || patch.address.length < 5) return res.status(400).json({ error:'Salon adı, telefon ve açık adres zorunludur.' });
    const media = validateMedia(body.media);
    if (media) patch.media = Object.fromEntries(Object.entries({ ...business.media, ...Object.fromEntries(Object.entries(media).filter(([,value])=>value!==undefined)) }).filter(([,value]) => value !== undefined));
    if (Object.hasOwn(body, 'branding')) patch.branding = normalizeBranding(body.branding);
    await ref.update(patch);
    const updated = { ...business, ...patch };
    await syncPublicBusiness(profile.businessId, updated, db);
    return res.status(200).json({ success:true, businessId:profile.businessId, business:updated });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error:error.statusCode ? error.message : 'Salon profili güncellenemedi.' });
  }
}

export default (req,res)=>handleSalonProfileWithDatabase(req,res,getAdminDatabase());
