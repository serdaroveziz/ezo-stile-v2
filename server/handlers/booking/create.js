/* EZO STİLE v2 - Atomic Serverless Double Booking Prevention & Source Attribution Endpoint */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, customerUid, customerName, customerPhone, staffId, serviceId, serviceName, date, time, source } = req.body || {};

    if (!businessId || !customerUid || !staffId || !serviceId || !date || !time) {
      return res.status(400).json({ error: 'Eksik randevu bilgileri' });
    }

    // 1. SALON SUSPENSION GUARD CHECK
    const bizRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`);
    const biz = bizRes.ok ? await bizRes.json() : null;

    if (biz && biz.status === 'suspended') {
      console.warn(`[BOOKING BLOCKED] Attempted booking on suspended businessId: ${businessId}`);
      return res.status(403).json({ error: 'Bu salon şu anda askıya alınmıştır. Yeni randevu oluşturulamaz.' });
    }

    // 2. BACKEND DOUBLE BOOKING TRANSACTIONAL CHECK
    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allAptsData = allAptsRes.ok ? await allAptsRes.json() : null;
    const allApts = allAptsData ? Object.values(allAptsData) : [];

    const existingConflict = allApts.find(apt => 
      apt &&
      apt.businessId === businessId &&
      (apt.staffId === staffId || staffId === 'staff-any') &&
      apt.date === date &&
      apt.time === time &&
      apt.status !== 'cancelled' &&
      apt.status !== 'rejected'
    );

    if (existingConflict) {
      console.warn(`[DOUBLE BOOKING PREVENTED] Conflict detected for Business: ${businessId}, Staff: ${staffId}, Date: ${date}, Time: ${time}`);
      return res.status(409).json({
        error: 'Bu tarih ve saatte seçili personel doludur. Lütfen başka bir saat seçiniz.',
        conflictAptId: existingConflict.aptId
      });
    }

    // 3. NEW CUSTOMER ATTRIBUTION CHECK
    const priorCompletedApt = allApts.find(apt => 
      apt &&
      apt.customerUid === customerUid &&
      apt.businessId === businessId &&
      (apt.status === 'approved' || apt.status === 'completed')
    );

    const isNewCustomerForBusiness = !priorCompletedApt;
    const bookingSource = source || 'ezo_discovery';

    // 4. SAVE NEW APPOINTMENT WITH SOURCE ATTRIBUTION
    const aptId = 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const appointmentRecord = {
      aptId,
      businessId,
      customerUid,
      customerName: customerName || 'Müşteri',
      customerPhone: customerPhone || '05550000000',
      staffId,
      serviceId,
      serviceName: serviceName || 'Hizmet',
      date,
      time,
      status: 'pending',
      source: bookingSource,
      isNewCustomerForBusiness,
      createdAt: new Date().toISOString()
    };

    const saveRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appointmentRecord)
    });

    if (!saveRes.ok) {
      return res.status(500).json({ error: 'Randevu kaydedilemedi' });
    }

    return res.status(200).json({
      success: true,
      aptId,
      status: 'pending',
      appointment: appointmentRecord
    });

  } catch (err) {
    console.error('Booking create API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}