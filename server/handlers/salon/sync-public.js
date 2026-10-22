/* Authenticated public discovery projection refresh. */
import { syncPublicBusiness } from '../../public-business.js';
import { hasPermission } from '../../../src/staff-permissions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const { businessId } = req.body || {};
  const profile = req.auth && req.auth.profile;
  if (!businessId || !profile) return res.status(400).json({ error: 'Salon bilgisi zorunludur.' });
  const isSuperAdmin = profile.role === 'super_admin';
  const isOwner = profile.role === 'owner' && profile.businessId === businessId;
  const isManager = profile.role === 'manager' && profile.businessId === businessId && hasPermission(profile.permissions,'business.manage');
  if (!isSuperAdmin && !isOwner && !isManager) return res.status(403).json({ error: 'Public salon verisini güncelleme yetkiniz yok.' });
  const projection = await syncPublicBusiness(businessId);
  return res.status(200).json({ success: true, visible: Boolean(projection), businessId });
}
