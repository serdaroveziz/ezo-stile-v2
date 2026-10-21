/* UNELIVO - Authenticated, atomic and idempotent staff invitation redemption */
import { getAdminDatabase } from '../../firebase-admin.js';
import { syncPublicBusiness } from '../../public-business.js';
import crypto from 'crypto';
import { canonicalStaffPhone, normalizeStaffPhone, staffPhoneIndexPath, staffPhoneOf } from '../../staff-phone.js';
import { normalizePermissions } from '../../../src/staff-permissions.js';

const STAFF_ROLES = ['manager', 'barber', 'receptionist'];
const MAX_CLAIM_ATTEMPTS = 3;

export function normalizeInviteCode(value) {
  const compact = String(value == null ? '' : value).trim().replace(/\s+/g, '');
  return /^inv_/i.test(compact) ? compact.toLowerCase() : compact;
}

function phoneDigits(value) { return normalizeStaffPhone(value); }
function tokenHash(value) { return crypto.createHash('sha256').update(normalizeInviteCode(value)).digest('hex'); }
function acceptedUid(invite) { return String((invite && (invite.usedByUid || invite.acceptedByUid || invite.claimedByUid)) || ''); }
function isAccepted(invite) { return Boolean(invite && (invite.used === true || invite.status === 'accepted' || invite.status === 'used')); }

function validateClaimCandidate(invite, { normalizedToken, phone, uid }) {
  if (!invite || normalizeInviteCode(invite.token ?? invite.code) !== normalizedToken) {
    const error = new Error('Geçersiz davet kodu.'); error.statusCode = 404; throw error;
  }
  if (!invite.expiresAt || Date.now() > Number(invite.expiresAt)) {
    const error = new Error('Davet kodunun süresi dolmuş.'); error.statusCode = 410; throw error;
  }
  if (staffPhoneOf(invite) && staffPhoneOf(invite) !== phoneDigits(phone)) {
    const error = new Error('Davet kodu farklı bir telefon numarası için oluşturulmuş.'); error.statusCode = 403; throw error;
  }
  const claimantUid = acceptedUid(invite);
  if (claimantUid && claimantUid !== uid) {
    const error = new Error('Bu davet başka bir kullanıcı tarafından kullanılmış.'); error.statusCode = 409; throw error;
  }
  return invite;
}

async function repairAcceptedInvite({ db, inviteId, invite, uid, phone }) {
  const claimantUid = acceptedUid(invite);
  if (claimantUid && claimantUid !== uid) {
    const error = new Error('Bu davet başka bir kullanıcı tarafından kullanılmış.'); error.statusCode = 409; throw error;
  }
  const [profileSnapshot, staffSnapshot, businessesSnapshot] = await Promise.all([
    db.ref(`users/${uid}`).get(), db.ref(`businesses/${invite.businessId}/staff`).get(), db.ref('businesses').get()
  ]);
  const existingProfile = profileSnapshot.exists() ? profileSnapshot.val() : null;
  const targetBusiness = (businessesSnapshot.val() || {})[invite.businessId] || null;
  if (targetBusiness && targetBusiness.ownerUid === uid) {
    const error = new Error('Salon sahibi hesabı çalışan davetiyle değiştirilemez.'); error.statusCode = 409; throw error;
  }
  if (existingProfile && existingProfile.businessId && existingProfile.businessId !== invite.businessId) {
    const error = new Error('Bu hesap başka bir salonla bağlantılı.'); error.statusCode = 409; throw error;
  }
  const staffEntries = Object.entries(staffSnapshot.val() || {}).filter(([, staff]) => staff);
  const conflict = staffEntries.find(([id, staff]) => staff.active !== false && staffPhoneOf(staff) === phoneDigits(invite.phone || phone) && staff.userId !== uid && id !== `stf_${uid}`);
  if (conflict) {
    const error = new Error('Bu telefon numarası salon kadrosunda başka bir kullanıcıya bağlı.'); error.statusCode = 409; throw error;
  }
  for (const [otherBusinessId, business] of Object.entries(businessesSnapshot.val() || {})) {
    for (const [, otherStaff] of Object.entries((business && business.staff) || {})) {
      if (otherBusinessId !== invite.businessId && otherStaff && otherStaff.active !== false && staffPhoneOf(otherStaff) === phoneDigits(invite.phone || phone)) {
        const error = new Error('Bu telefon başka bir işletmede aktif çalışan hesabına bağlı.'); error.statusCode = 409; throw error;
      }
    }
  }
  const linkedStaff = staffEntries.find(([id, staff]) => staff.userId === uid || id === `stf_${uid}`);
  const staffId = linkedStaff ? linkedStaff[0] : `stf_${uid}`;
  const oldStaff = linkedStaff ? linkedStaff[1] : {};
  const role = STAFF_ROLES.includes(invite.role) ? invite.role : 'barber';
  const now = new Date().toISOString();
  const profile = {
    ...(existingProfile || {}), uid,
    name: (existingProfile && existingProfile.name) || invite.displayName,
    displayName: (existingProfile && existingProfile.displayName) || invite.displayName,
    phone: canonicalStaffPhone(invite.phone || phone), phoneNormalized: phoneDigits(invite.phone || phone), role, businessId: invite.businessId,
    permissions: normalizePermissions(invite.permissions,{role}),
    phoneVerified: existingProfile ? existingProfile.phoneVerified === true : false,
    createdAt: (existingProfile && existingProfile.createdAt) || now
  };
  const staff = {
    ...oldStaff, id: staffId, userId: uid,
    displayName: oldStaff.displayName || invite.displayName,
    phone: canonicalStaffPhone(invite.phone || phone), phoneNormalized: phoneDigits(invite.phone || phone), role, permissions:normalizePermissions(invite.permissions,{role}),
    services: invite.services || oldStaff.services || ['all'], active: true,
    createdAt: oldStaff.createdAt || profile.createdAt || now
  };
  await db.ref().update({
    [`staff_invites/${inviteId}`]: null,
    [`users/${uid}`]: profile,
    [`businesses/${invite.businessId}/staff/${staffId}`]: staff,
    [staffPhoneIndexPath(invite.phone || phone)]: { state:'active', phoneNormalized:phoneDigits(invite.phone || phone), businessId:invite.businessId, staffId, uid, acceptedTokenHash:tokenHash(invite.token ?? invite.code), updatedAt:now }
  });
  const [finalProfileSnapshot, finalStaffSnapshot, finalIndexSnapshot, finalInviteSnapshot] = await Promise.all([
    db.ref(`users/${uid}`).get(),
    db.ref(`businesses/${invite.businessId}/staff/${staffId}`).get(),
    db.ref(staffPhoneIndexPath(invite.phone || phone)).get(),
    db.ref(`staff_invites/${inviteId}`).get()
  ]);
  const finalProfile = finalProfileSnapshot.exists() ? finalProfileSnapshot.val() : null;
  const finalStaff = finalStaffSnapshot.exists() ? finalStaffSnapshot.val() : null;
  const finalIndex = finalIndexSnapshot.exists() ? finalIndexSnapshot.val() : null;
  const finalPermissions = normalizePermissions(invite.permissions,{role});
  const finalized = finalProfile && finalProfile.role === role && finalProfile.businessId === invite.businessId &&
    finalStaff && finalStaff.userId === uid && finalStaff.role === role && finalStaff.active !== false &&
    Array.isArray(finalProfile.permissions) && Array.isArray(finalStaff.permissions) &&
    JSON.stringify(normalizePermissions(finalProfile.permissions,{role})) === JSON.stringify(finalPermissions) &&
    JSON.stringify(normalizePermissions(finalStaff.permissions,{role})) === JSON.stringify(finalPermissions) &&
    finalIndex && finalIndex.state === 'active' && finalIndex.uid === uid && finalIndex.businessId === invite.businessId &&
    !finalInviteSnapshot.exists();
  if (!finalized) {
    const error = new Error('Çalışan hesabı bağlantısı doğrulanamadı. Lütfen tekrar deneyin.'); error.statusCode = 409; throw error;
  }
  await syncPublicBusiness(invite.businessId, null, db);
  return { success: true, user: finalProfile, alreadyAccepted: isAccepted(invite), reconciled: true };
}

export async function acceptStaffInvite({ db, uid, token, phone }) {
  const normalizedToken = normalizeInviteCode(token);
  const normalizedPhone = normalizeStaffPhone(phone);
  if (!normalizedToken || !normalizedPhone) {
    const error = new Error('Geçerli davet kodu ve telefon zorunludur.'); error.statusCode = 400; throw error;
  }
  const invitesSnapshot = await db.ref('staff_invites').get();
  const entries = Object.entries(invitesSnapshot.val() || {}).filter(([, record]) => record && normalizeInviteCode(record.token ?? record.code) === normalizedToken);
  if (!entries.length) {
    const [indexSnapshot, profileSnapshot] = await Promise.all([db.ref(staffPhoneIndexPath(normalizedPhone)).get(), db.ref(`users/${uid}`).get()]);
    const index = indexSnapshot.exists() ? indexSnapshot.val() : null;
    if (index && index.state === 'active' && index.uid === uid && index.acceptedTokenHash === tokenHash(normalizedToken) && profileSnapshot.exists()) return { success:true, user:profileSnapshot.val(), alreadyAccepted:true, reconciled:true };
    const error = new Error('Geçersiz davet kodu.'); error.statusCode = 404; throw error;
  }
  if (entries.length !== 1) { const error = new Error('Davet kodu benzersiz değil.'); error.statusCode = 409; throw error; }
  const [inviteId, initialInvite] = entries[0];
  validateClaimCandidate(initialInvite, { normalizedToken, phone, uid });
  if (isAccepted(initialInvite)) return repairAcceptedInvite({ db, inviteId, invite: initialInvite, uid, phone });

  let latestInvite = initialInvite;
  for (let attempt = 1; attempt <= MAX_CLAIM_ATTEMPTS; attempt += 1) {
    const latestSnapshot = await db.ref(`staff_invites/${inviteId}`).get();
    latestInvite = latestSnapshot.exists() ? latestSnapshot.val() : null;
    validateClaimCandidate(latestInvite, { normalizedToken, phone, uid });
    if (isAccepted(latestInvite)) return repairAcceptedInvite({ db, inviteId, invite: latestInvite, uid, phone });

    let nullCallbackCount = 0;
    const claimed = await db.ref(`staff_invites/${inviteId}`).transaction(current => {
      // RTDB may invoke the callback with an empty local cache before the server
      // value arrives. Use the freshly re-read, fully validated invite as the
      // optimistic input; a server conflict reruns this callback with current data.
      const candidate = current || (++nullCallbackCount <= MAX_CLAIM_ATTEMPTS ? latestInvite : null);
      if (!candidate) return;
      if (normalizeInviteCode(candidate.token ?? candidate.code) !== normalizedToken) return;
      if (!candidate.expiresAt || Date.now() > Number(candidate.expiresAt)) return;
      if (candidate.phone && phoneDigits(candidate.phone) !== phoneDigits(phone)) return;
      const currentClaimant = acceptedUid(candidate);
      if (isAccepted(candidate) || (currentClaimant && currentClaimant !== uid)) return;
      const now = new Date().toISOString();
      return { ...candidate, used: true, status: 'accepted', usedByUid: uid, acceptedByUid: uid, usedAt: now };
    });
    if (claimed.committed) {
      const claimedInvite = claimed.snapshot && claimed.snapshot.exists() ? claimed.snapshot.val() : { ...latestInvite, used: true, status: 'accepted', usedByUid: uid, acceptedByUid: uid };
      validateClaimCandidate(claimedInvite, { normalizedToken, phone, uid });
      return repairAcceptedInvite({ db, inviteId, invite: claimedInvite, uid, phone });
    }

    const afterSnapshot = await db.ref(`staff_invites/${inviteId}`).get();
    latestInvite = afterSnapshot.exists() ? afterSnapshot.val() : null;
    validateClaimCandidate(latestInvite, { normalizedToken, phone, uid });
    if (isAccepted(latestInvite)) return repairAcceptedInvite({ db, inviteId, invite: latestInvite, uid, phone });
  }
  const error = new Error('Davet kabul işlemi geçici olarak tamamlanamadı. Lütfen tekrar deneyin.'); error.statusCode = 409; throw error;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!req.auth || !req.auth.uid) return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  try {
    const result = await acceptStaffInvite({ db: getAdminDatabase(), uid: req.auth.uid, token: req.body && (req.body.token ?? req.body.code), phone: req.body && req.body.phone });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Accept invite API error:', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Çalışan daveti kabul edilemedi.' });
  }
}
