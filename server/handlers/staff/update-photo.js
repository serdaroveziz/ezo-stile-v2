import { getAdminDatabase } from '../../firebase-admin.js';
import { syncPublicBusiness } from '../../public-business.js';

function validPhoto(value) {
  return typeof value === 'string' && value.length <= 2000000 && /^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const profile = req.auth && req.auth.profile;
  const photoUrl = req.body && req.body.photoUrl;
  if (!profile || !['barber', 'receptionist', 'manager'].includes(profile.role) || !profile.businessId) return res.status(403).json({ error: 'Çalışan hesabı gerekli.' });
  if (!validPhoto(photoUrl)) return res.status(400).json({ error: 'Yalnız güvenli JPEG, PNG veya WebP fotoğraf kabul edilir.' });
  const db = getAdminDatabase();
  const snapshot = await db.ref(`businesses/${profile.businessId}/staff`).get();
  const entries = Object.entries(snapshot.val() || {});
  const staffEntry = entries.find(([key, staff]) => staff && (staff.userId === req.auth.uid || staff.uid === req.auth.uid || key === `stf_${req.auth.uid}`));
  if (!staffEntry) return res.status(404).json({ error: 'Çalışan kaydı bulunamadı.' });
  await db.ref().update({ [`users/${req.auth.uid}/photoUrl`]: photoUrl, [`businesses/${profile.businessId}/staff/${staffEntry[0]}/photoUrl`]: photoUrl });
  await syncPublicBusiness(profile.businessId, null, db);
  return res.status(200).json({ success: true });
}
