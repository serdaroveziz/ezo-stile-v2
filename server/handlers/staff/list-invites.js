/* UNELIVO - Tenant-scoped pending staff invitation list */
import { getAdminDatabase } from '../../firebase-admin.js';
import { isValidPendingInvite, staffPhoneIndexPath, staffPhoneOf } from '../../staff-phone.js';
import { hasPermission, normalizePermissions } from '../../../src/staff-permissions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const caller = req.auth && req.auth.profile;
  const canList = caller && (caller.role === 'owner' || (caller.role === 'manager' && hasPermission(caller.permissions,'staff.manage')));
  if (!canList || !caller.businessId) return res.status(403).json({ error: 'Personel davetlerini görme yetkiniz yok.' });

  const snapshot = await getAdminDatabase().ref('staff_invites').get();
  const now = Date.now();
  const expired = Object.entries(snapshot.val() || {}).filter(([, invite]) => invite && invite.businessId === caller.businessId && invite.used !== true && Number(invite.expiresAt || 0) <= now).map(([id]) => id);
  if (expired.length) {
    const db = getAdminDatabase(); const source = snapshot.val() || {};
    await db.ref().update(Object.fromEntries(expired.map(id => [`staff_invites/${id}`, null])));
    await Promise.all(expired.map(id => { const indexPath=staffPhoneIndexPath(staffPhoneOf(source[id])); return indexPath ? db.ref(indexPath).transaction(current => current && current.inviteId === id ? null : current) : null; }));
  }
  const invitations = Object.entries(snapshot.val() || {})
    .filter(([, invite]) => invite && invite.businessId === caller.businessId && isValidPendingInvite(invite, now))
    .map(([nodeId, invite]) => ({ inviteId: nodeId, displayName: invite.displayName, phone: invite.phone, phoneNormalized: invite.phoneNormalized, role: invite.role, permissions: normalizePermissions(invite.permissions,{role:invite.role}), expiresAt: invite.expiresAt, status: 'pending' }))
    .sort((a, b) => Number(a.expiresAt) - Number(b.expiresAt));
  return res.status(200).json({ success: true, invitations });
}
