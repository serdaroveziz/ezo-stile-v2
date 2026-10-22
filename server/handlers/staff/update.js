import { getAdminDatabase } from '../../firebase-admin.js';
import { normalizePermissions, sanitizeStaffPermissions } from '../../../src/staff-permissions.js';
import { syncPublicBusiness } from '../../public-business.js';
import { staffPhoneIndexPath, staffPhoneOf } from '../../staff-phone.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const caller = req.auth && req.auth.profile;
  if (!caller || caller.role !== 'owner' || !caller.businessId) return res.status(403).json({ error: 'Çalışan yönetimi yalnız salon sahibine açıktır.' });
  const { staffId, role, permissions, active, commissionPercent } = req.body || {};
  if (!staffId) return res.status(400).json({ error: 'Çalışan kimliği zorunludur.' });
  const db = getAdminDatabase();
  const ref = db.ref(`businesses/${caller.businessId}/staff/${staffId}`);
  const snapshot = await ref.get();
  const staff = snapshot.exists() ? snapshot.val() : null;
  if (!staff) return res.status(404).json({ error: 'Çalışan bulunamadı.' });
  const nextRole = role || staff.role;
  if (!['barber','receptionist','manager'].includes(nextRole)) return res.status(400).json({ error: 'Geçersiz çalışan rolü.' });
  let nextPermissions;
  try { nextPermissions = permissions !== undefined ? sanitizeStaffPermissions(nextRole, permissions) : normalizePermissions(staff.permissions,{role:nextRole}); }
  catch (error) { return res.status(error.statusCode || 400).json({ error:error.message || 'Geçersiz çalışan yetkisi.' }); }
  const percent = Math.min(100, Math.max(0, Number(commissionPercent ?? staff.commissionPercent ?? 0)));
  const patch = { role: nextRole, permissions: nextPermissions, active: active !== undefined ? active === true : staff.active !== false, commissionPercent: percent, updatedAt: new Date().toISOString() };
  const phoneIndexPath = staffPhoneIndexPath(staffPhoneOf(staff));
  if (patch.active && phoneIndexPath) {
    const claim = await db.ref(phoneIndexPath).transaction(current => {
      if (current && current.state === 'active' && (current.businessId !== caller.businessId || current.staffId !== staffId)) return;
      if (current && current.state === 'pending') return;
      return { ...(current || {}), state:'active', phoneNormalized:staffPhoneOf(staff), businessId:caller.businessId, staffId, uid:staff.userId || null, updatedAt:new Date().toISOString() };
    });
    if (!claim.committed) return res.status(409).json({ error:'Bu telefon başka bir aktif çalışan veya bekleyen davet tarafından kullanılıyor.' });
  }
  const updates = { [`businesses/${caller.businessId}/staff/${staffId}`]: { ...staff, ...patch } };
  if (staff.userId) {
    updates[`users/${staff.userId}/role`] = nextRole;
    updates[`users/${staff.userId}/businessId`] = caller.businessId;
    updates[`users/${staff.userId}/permissions`] = nextPermissions;
    updates[`users/${staff.userId}/disabled`] = patch.active === false;
  }
  await db.ref().update(updates);
  if (!patch.active && phoneIndexPath) await db.ref(phoneIndexPath).transaction(current => current && current.businessId === caller.businessId && current.staffId === staffId ? null : current);
  await syncPublicBusiness(caller.businessId, null, db);
  return res.status(200).json({ success: true, staff: { ...staff, ...patch } });
}
