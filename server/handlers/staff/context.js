import { getAdminDatabase } from '../../firebase-admin.js';
import { projectStaffBusiness } from '../../staff-projection.js';
export async function handleStaffContextWithDatabase(req, res, db) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const profile = req.auth?.profile;
  const businessId = req.body?.businessId;
  if (!profile || !['barber','manager','receptionist'].includes(profile.role) || !businessId || businessId !== profile.businessId) return res.status(403).json({ error: 'Salon erişimi reddedildi.' });
  const snapshot = await db.ref('businesses/' + businessId).get();
  const business = snapshot.val();
  // Recheck current membership before disclosing any projection.
  const member = Object.values(business?.staff || {}).find(item => item && item.userId === req.auth.uid && item.role === profile.role && item.active !== false);
  if (!member) return res.status(403).json({ error: 'Aktif personel üyeliği bulunamadı.' });
  return res.status(200).json(projectStaffBusiness(business, req.auth.uid, member.permissions || []));
}

export default (req,res)=>handleStaffContextWithDatabase(req,res,getAdminDatabase());
