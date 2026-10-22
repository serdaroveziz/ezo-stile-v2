import { getAdminDatabase } from '../../firebase-admin.js';
import { effectiveAppointmentStatus } from '../../../src/appointment-lifecycle.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  const appointmentId = String((req.body && req.body.appointmentId) || '').trim();
  const uid = req.auth && req.auth.uid;
  if (!uid || !appointmentId) return res.status(400).json({ error: 'Randevu bilgisi zorunludur.' });
  const db = getAdminDatabase();
  const snapshot = await db.ref(`appointments/${appointmentId}`).get();
  if (!snapshot.exists()) return res.status(404).json({ error: 'Randevu bulunamadı.' });
  const appointment = snapshot.val();
  if (appointment.customerUid !== uid) return res.status(403).json({ error: 'Bu randevuya erişim yetkiniz yok.' });
  const effectiveStatus = effectiveAppointmentStatus(appointment);
  if (!['completed', 'cancelled', 'rejected', 'no_show', 'expired'].includes(effectiveStatus)) return res.status(409).json({ error: 'Aktif veya yaklaşan randevu geçmişten kaldırılamaz.' });
  await db.ref(`users/${uid}/hiddenAppointments/${appointmentId}`).set(true);
  return res.status(200).json({ success: true, appointmentId });
}
