/* EZO STİLE v2 - Serverless Appointment Status Update Endpoint with Tenant Authorization */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { aptId, newStatus, userUid } = req.body || {};

    if (!aptId || !newStatus || !userUid) {
      return res.status(400).json({ error: 'aptId, newStatus ve userUid zorunludur' });
    }

    const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'reschedule_requested'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Geçersiz randevu durumu' });
    }

    // 1. FETCH APPOINTMENT
    const aptRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`);
    const apt = aptRes.ok ? await aptRes.json() : null;

    if (!apt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    // 2. FETCH USER PROFILE FOR AUTHORIZATION
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(403).json({ error: 'Yetkisiz kullanıcı' });
    }

    // AUTHORIZATION MATRIX:
    // - Customer can set 'cancelled' or 'reschedule_requested' on own appointment
    // - Owner / Staff can set 'approved' or 'rejected' on appointments belonging to their businessId
    // - Super Admin can set any status
    const isCustomerOwner = apt.customerUid === userUid;
    const isStaffOfBusiness = user.businessId && user.businessId === apt.businessId;
    const isSuperAdmin = user.role === 'super_admin';

    if (newStatus === 'cancelled' || newStatus === 'reschedule_requested') {
      if (!isCustomerOwner && !isStaffOfBusiness && !isSuperAdmin) {
        return res.status(403).json({ error: 'Sadece kendi randevunuzu iptal edebilirsiniz' });
      }
    } else if (newStatus === 'approved' || newStatus === 'rejected') {
      if (!isStaffOfBusiness && !isSuperAdmin) {
        console.warn(`[SECURITY ALERT] Cross-tenant approval attack by UID: ${userUid} on Apt BusinessId: ${apt.businessId}`);
        return res.status(403).json({ error: 'Yetkisiz erişim! Başka salonun randevusunu değiştiremezsiniz.' });
      }
    }

    // 3. UPDATE APPOINTMENT STATUS
    const updateRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        updatedAt: new Date().toISOString()
      })
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Randevu durumu güncellenemedi' });
    }

    return res.status(200).json({
      success: true,
      aptId,
      status: newStatus
    });

  } catch (err) {
    console.error('Status update API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}