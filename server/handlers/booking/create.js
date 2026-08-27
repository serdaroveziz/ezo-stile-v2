/* EZO STİLE v2 - Serverless Booking Engine with Manual Booking, Price Snapshots, Weekly Schedule & Booking Enabled Guards */
const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      businessId,
      customerUid,
      customerName,
      customerPhone,
      staffId,
      serviceId,
      serviceName,
      servicePrice,
      serviceDuration,
      date,
      time,
      source,
      isManual,
      initialStatus
    } = req.body || {};

    if (!businessId || !staffId || !serviceId || !date || !time) {
      return res.status(400).json({ error: 'Eksik randevu bilgileri' });
    }

    // 1. SALON PROFILE & BOOKING ENABLED GUARDS
    const bizRes = await fetch(`${FIREBASE_DB_URL}/businesses/${businessId}.json`);
    const biz = bizRes.ok ? await bizRes.json() : null;

    if (biz) {
      if (biz.status === 'suspended') {
        return res.status(403).json({ error: 'Bu salon şu anda askıya alınmıştır. Yeni randevu oluşturulamaz.' });
      }

      // ONLINE BOOKING CLOSED CHECK (Bypassed for Manual Bookings)
      if (biz.bookingEnabled === false && !isManual) {
        return res.status(403).json({ error: 'Bu salon şu anda online randevu kabul etmiyor.' });
      }

      // WEEKLY SCHEDULE DAY-OFF CHECK (Bypassed for Manual Bookings)
      if (biz.weeklySchedule && !isManual) {
        const aptDateObj = new Date(date);
        const dayIdx = (aptDateObj.getDay() + 6) % 7; // Monday = 0, Sunday = 6
        const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const dayKey = dayKeys[dayIdx];
        const daySched = biz.weeklySchedule[dayKey];

        if (daySched && daySched.isOpen === false) {
          return res.status(400).json({ error: 'Salon seçilen tarihte kapalıdır.' });
        }
      }
    }

    // 2. BACKEND INTERVAL OVERLAP CHECK (startTime -> endTime)
    const durationMinutes = parseInt(serviceDuration) || 30;
    const [startH, startM] = time.split(':').map(Number);
    const newStartMins = startH * 60 + startM;
    const newEndMins = newStartMins + durationMinutes;

    const endH = Math.floor(newEndMins / 60);
    const endM = newEndMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allAptsData = allAptsRes.ok ? await allAptsRes.json() : null;
    const allApts = allAptsData ? Object.values(allAptsData) : [];

    const existingConflict = allApts.find(apt => {
      if (!apt || apt.businessId !== businessId || apt.date !== date) return false;
      if (apt.status === 'cancelled' || apt.status === 'rejected') return false;
      if (apt.staffId !== staffId && staffId !== 'staff-any' && apt.staffId !== 'staff-any') return false;

      const aptDuration = parseInt(apt.serviceDuration) || 30;
      const [exH, exM] = (apt.time || '00:00').split(':').map(Number);
      const exStartMins = exH * 60 + exM;
      const exEndMins = exStartMins + aptDuration;

      return (newStartMins < exEndMins && newEndMins > exStartMins);
    });

    if (existingConflict) {
      return res.status(409).json({
        error: `Seçtiğiniz ${time} - ${endTimeStr} aralığında seçili berber doludur. Lütfen başka bir saat seçiniz.`,
        conflictAptId: existingConflict.aptId
      });
    }

    // 3. NEW CUSTOMER ATTRIBUTION CHECK
    const effectiveCustomerUid = customerUid || ('usr_manual_' + Date.now());
    const priorCompletedApt = allApts.find(apt => 
      apt &&
      apt.customerUid === effectiveCustomerUid &&
      apt.businessId === businessId &&
      (apt.status === 'approved' || apt.status === 'completed')
    );

    const isNewCustomerForBusiness = !priorCompletedApt;
    const bookingSource = source || (isManual ? 'owner_manual' : 'ezo_discovery');
    const assignedStatus = initialStatus || (isManual ? 'approved' : 'pending');

    // 4. SAVE NEW APPOINTMENT RECORD WITH PRICE & NAME SNAPSHOTS
    const businessNameSnapshot = biz ? (biz.name || 'EZO Salon') : 'EZO Salon';
    const aptId = 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const appointmentRecord = {
      businessNameSnapshot,
      aptId,
      businessId,
      customerUid: effectiveCustomerUid,
      customerName: customerName || 'Müşteri',
      customerPhone: customerPhone || '05550000000',
      staffId,
      serviceId,
      serviceName: serviceName || 'Hizmet',
      servicePrice: parseInt(servicePrice) || 350,
      servicePriceSnapshot: parseInt(servicePrice) || 350,
      serviceNameSnapshot: serviceName || 'Hizmet',
      serviceDuration: durationMinutes,
      date,
      time,
      startTime: time,
      endTime: endTimeStr,
      status: assignedStatus,
      source: bookingSource,
      isManual: Boolean(isManual),
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
      status: assignedStatus,
      appointment: appointmentRecord
    });

  } catch (err) {
    console.error('Booking create API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
