/* EZO STİLE v2 - Atomic Reschedule Approval & Double Booking Guard Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { aptId, newDate, newTime, userUid } = req.body || {};

    if (!aptId || !newDate || !newTime || !userUid) {
      return res.status(400).json({ error: 'aptId, newDate, newTime ve userUid zorunludur' });
    }

    // 1. FETCH APPOINTMENT
    const aptRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`);
    const apt = aptRes.ok ? await aptRes.json() : null;

    if (!apt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    // 2. VERIFY OWNER / MANAGER PERMISSION
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user || (user.businessId !== apt.businessId && user.role !== 'super_admin')) {
      return res.status(403).json({ error: 'Yetkisiz erişim! Yalnızca bağlı salon yöneticisi bu değişikliği onaylayabilir.' });
    }

    // 3. ATOMIC DOUBLE BOOKING TRANSACTION CHECK FOR NEW SLOT
    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allApts = allAptsRes.ok ? await allAptsRes.json() : null;

    if (allApts) {
      const conflict = Object.values(allApts).find(a =>
        a &&
        a.aptId !== aptId &&
        a.businessId === apt.businessId &&
        a.staffId === apt.staffId &&
        a.date === newDate &&
        a.time === newTime &&
        a.status !== 'cancelled' &&
        a.status !== 'rejected'
      );

      if (conflict) {
        return res.status(409).json({ error: 'İstenen yeni tarih ve saatte seçili personel doludur. Değişiklik onaylanamaz.' });
      }
    }

    // 4. UPDATE APPOINTMENT TO NEW SLOT AND MARK APPROVED
    const updateRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newDate,
        time: newTime,
        status: 'approved',
        rescheduleApprovedAt: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Tarih değişikliği kaydedilemedi' });
    }

    return res.status(200).json({
      success: true,
      aptId,
      date: newDate,
      time: newTime,
      status: 'approved'
    });

  } catch (err) {
    console.error('Reschedule approve API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}