import { getAdminAuth, getAdminDatabase } from '../../firebase-admin.js';
import { canonicalStaffPhone, normalizeStaffPhone, staffPhoneIndexPath } from '../../staff-phone.js';

const STAFF_ROLES = new Set(['barber', 'receptionist', 'manager']);
const LANGUAGES = new Set(['tr', 'en', 'ru', 'ar', 'tk', 'fa']);
const FORBIDDEN_FIELDS = new Set(['uid', 'staffId', 'userId', 'role', 'permissions', 'businessId', 'ownerUid', 'disabled', 'status', 'active', 'commissionPercent', 'email', 'photoUrl']);

export function normalizeStaffDisplayName(value) {
  return String(value || '').trim().replace(/[<>&"'`]/g, '').replace(/\s+/g, ' ')
    .split(' ').filter(Boolean).map(part => part.charAt(0).toLocaleUpperCase('tr-TR') + part.slice(1).toLocaleLowerCase('tr-TR')).join(' ');
}

export function hasForbiddenSelfProfileFields(body = {}) {
  return Object.keys(body || {}).some(key => FORBIDDEN_FIELDS.has(key));
}

export function findOwnStaffEntry(staffRecords, uid) {
  return Object.entries(staffRecords || {}).find(([key, staff]) => staff && (staff.userId === uid || staff.uid === uid || key === `stf_${uid}`));
}

export function normalizeSelfProfileInput(body = {}) {
  const output = {};
  if (Object.prototype.hasOwnProperty.call(body, 'displayName')) {
    const displayName = normalizeStaffDisplayName(body.displayName);
    if (displayName.length < 2 || displayName.length > 80) throw Object.assign(new Error('Ad soyad 2–80 karakter olmalıdır.'), { statusCode: 400 });
    output.displayName = displayName;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'phone')) {
    const phone = canonicalStaffPhone(body.phone);
    if (!phone) throw Object.assign(new Error('Geçerli bir Türkiye telefon numarası giriniz.'), { statusCode: 400 });
    output.phone = phone;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'language')) {
    if (!LANGUAGES.has(body.language)) throw Object.assign(new Error('Geçersiz dil seçimi.'), { statusCode: 400 });
    output.language = body.language;
  }
  if (Object.prototype.hasOwnProperty.call(body, 'notificationsEnabled')) {
    if (typeof body.notificationsEnabled !== 'boolean') throw Object.assign(new Error('Bildirim tercihi geçersiz.'), { statusCode: 400 });
    output.notificationsEnabled = body.notificationsEnabled;
  }
  if (!Object.keys(output).length) throw Object.assign(new Error('Güncellenecek profil alanı bulunamadı.'), { statusCode: 400 });
  return output;
}

function authEmailForPhone(phone) {
  return `${normalizeStaffPhone(phone)}@auth.ezostile.app`;
}

async function assertPhoneAvailable(adminAuth, uid, phone) {
  try {
    const existing = await adminAuth.getUserByEmail(authEmailForPhone(phone));
    if (existing.uid !== uid) throw Object.assign(new Error('Bu telefon başka bir hesap tarafından kullanılıyor.'), { statusCode: 409 });
  } catch (error) {
    if (error && error.code === 'auth/user-not-found') return;
    throw error;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const caller = req.auth && req.auth.profile;
  const uid = req.auth && req.auth.uid;
  if (!uid || !caller || !STAFF_ROLES.has(caller.role) || !caller.businessId) return res.status(403).json({ error: 'Çalışan hesabı gerekli.' });
  if (hasForbiddenSelfProfileFields(req.body)) return res.status(403).json({ error: 'Rol, salon ve yetki alanları değiştirilemez.' });

  try {
    const input = normalizeSelfProfileInput(req.body || {});
    const db = getAdminDatabase();
    const staffSnapshot = await db.ref(`businesses/${caller.businessId}/staff`).get();
    const staffEntry = findOwnStaffEntry(staffSnapshot.val(), uid);
    if (!staffEntry) return res.status(403).json({ error: 'Kendi çalışan kaydınız doğrulanamadı.' });
    const [staffId, staff] = staffEntry;
    if (staff.active === false || staff.role !== caller.role) return res.status(403).json({ error: 'Çalışan kaydı aktif rolünüzle eşleşmiyor.' });

    const oldPhone = canonicalStaffPhone(staff.phone || caller.phone);
    const nextPhone = input.phone || oldPhone;
    const phoneChanged = Boolean(input.phone && normalizeStaffPhone(input.phone) !== normalizeStaffPhone(oldPhone));
    const adminAuth = getAdminAuth();
    if (phoneChanged) await assertPhoneAvailable(adminAuth, uid, nextPhone);

    const now = new Date().toISOString();
    const nextStaff = { ...staff, updatedAt: now };
    const nextUser = { displayName: input.displayName ?? caller.displayName ?? caller.name, name: input.displayName ?? caller.name, language: input.language ?? caller.language ?? 'tr', notificationsEnabled: input.notificationsEnabled ?? caller.notificationsEnabled !== false, updatedAt: now };
    if (input.displayName) { nextStaff.displayName = input.displayName; nextStaff.name = input.displayName; }
    if (phoneChanged) { nextStaff.phone = nextPhone; nextStaff.phoneNormalized = normalizeStaffPhone(nextPhone); nextUser.phone = nextPhone; }

    let newIndexPath = '';
    if (phoneChanged) {
      newIndexPath = staffPhoneIndexPath(nextPhone);
      const claim = await db.ref(newIndexPath).transaction(current => {
        if (current && (current.businessId !== caller.businessId || current.staffId !== staffId || current.uid !== uid)) return;
        return { state:'active', phoneNormalized:normalizeStaffPhone(nextPhone), businessId:caller.businessId, staffId, uid, updatedAt:now };
      });
      if (!claim.committed) return res.status(409).json({ error: 'Bu telefon başka bir çalışan veya davet tarafından kullanılıyor.' });
    }

    let authChanged = false;
    try {
      if (phoneChanged) await adminAuth.updateUser(uid, { email: authEmailForPhone(nextPhone), displayName: nextUser.displayName });
      else if (input.displayName) await adminAuth.updateUser(uid, { displayName: nextUser.displayName });
      authChanged = phoneChanged || Boolean(input.displayName);
      const userUpdates = {
        [`users/${uid}/displayName`]: nextUser.displayName,
        [`users/${uid}/name`]: nextUser.name,
        [`users/${uid}/language`]: nextUser.language,
        [`users/${uid}/notificationsEnabled`]: nextUser.notificationsEnabled,
        [`users/${uid}/updatedAt`]: now,
        [`businesses/${caller.businessId}/staff/${staffId}`]: nextStaff
      };
      if (phoneChanged) userUpdates[`users/${uid}/phone`] = nextPhone;
      await db.ref().update(userUpdates);
    } catch (error) {
      if (authChanged) await adminAuth.updateUser(uid, { email: authEmailForPhone(oldPhone), displayName: staff.displayName || staff.name || caller.displayName || caller.name || '' }).catch(() => {});
      if (newIndexPath) await db.ref(newIndexPath).transaction(current => current && current.businessId === caller.businessId && current.staffId === staffId && current.uid === uid ? null : current);
      throw error;
    }
    if (phoneChanged) {
      const oldIndexPath = staffPhoneIndexPath(oldPhone);
      if (oldIndexPath && oldIndexPath !== newIndexPath) await db.ref(oldIndexPath).transaction(current => current && current.businessId === caller.businessId && current.staffId === staffId && current.uid === uid ? null : current);
    }
    return res.status(200).json({ success:true, user:{ ...caller, ...nextUser, phone:nextPhone, uid }, staff:{ id:staffId, ...nextStaff } });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error:error.statusCode ? error.message : 'Profil güncellenemedi.' });
  }
}
