/* UNELIVO - Authenticated Firebase profile resolution */
import { getAdminDatabase } from '../../firebase-admin.js';
import { normalizePermissions } from '../../../src/staff-permissions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const authContext = req.auth;
  if (!authContext || !authContext.uid) {
    return res.status(401).json({ error: 'Oturum doğrulaması gerekli.' });
  }
  const profile = authContext.profile;
  if (!profile) return res.status(404).json({ error: 'Kullanıcı profili bulunamadı.' });
  if (profile.disabled === true || profile.status === 'disabled') {
    return res.status(403).json({ error: 'Hesabınız devre dışı bırakılmış.' });
  }

  const allowedRoles = ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'];
  const staffRoles = ['manager', 'barber', 'receptionist'];
  const resolvedRole = allowedRoles.includes(profile.role) ? profile.role : 'customer';
  const resolvedPermissions = profile.permissions;
  const safeUser = {
    uid: authContext.uid,
    phone: profile.phone || '',
    name: profile.displayName || profile.name || 'EZO Kullanıcısı',
    displayName: profile.displayName || profile.name || 'EZO Kullanıcısı',
    role: resolvedRole,
    businessId: resolvedRole === 'customer' ? null : (profile.businessId || null),
    permissions: normalizePermissions(resolvedPermissions,{ role: staffRoles.includes(resolvedRole) ? resolvedRole : null }),
    aiCredits: profile.aiCredits || { economy: 3, premium: 1 },
    language: profile.language || 'tr',
    photoUrl: profile.photoUrl || null
  };
  if (profile.uid !== authContext.uid) {
    await getAdminDatabase().ref(`users/${authContext.uid}/uid`).set(authContext.uid);
  }
  const diagnosticEnabled = process.env.AUTH_RESOLUTION_DEBUG === 'true' && process.env.VERCEL_ENV !== 'production';
  const decision = authContext.resolution || { reason:'LEGACY_AUTH_CONTEXT', sourceRole:profile.role || null, sourceBusinessId:profile.businessId || null, businessExists:null, ownershipVerified:false, staffVerified:false, staffRole:null };
  if (diagnosticEnabled) {
    console.info('[AUTH_RESOLUTION]', JSON.stringify({ authUid:authContext.uid, sourceRole:decision.sourceRole, sourceBusinessId:decision.sourceBusinessId, businessExists:decision.businessExists, ownershipVerified:decision.ownershipVerified, staffVerified:decision.staffVerified, staffRole:decision.staffRole, finalRole:safeUser.role, finalBusinessId:safeUser.businessId, resolutionReason:decision.reason }));
  }
  return res.status(200).json({ success:true, user:safeUser, ...(diagnosticEnabled?{debug:{resolutionReason:decision.reason,ownershipVerified:decision.ownershipVerified,staffVerified:decision.staffVerified}}:{}) });
}
