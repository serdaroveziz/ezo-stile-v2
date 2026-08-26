/* EZO STİLE v2 - Atomic Reschedule & 6-Hour Rule Engine */
import { sendNotification } from '../notifications/send.js';

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

    // 2. FETCH CALLER USER
    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(403).json({ error: 'Kullanıcı bulunamadı' });
    }

    const isCustomer = userUid === apt.customerUid;
    const isOwnerOrAdmin = user.role === 'super_admin' || (user.businessId === apt.businessId && user.role !== 'customer');

    if (!isCustomer && !isOwnerOrAdmin) {
      return res.status(403).json({ error: 'Bu randevu üzerinde yetkiniz bulunmamaktadır.' });
    }

    // 3. SERVER TIME AUTHORITATIVE 6-HOUR RULE CHECK FOR CUSTOMER
    const aptTimeMs = new Date(`${apt.date}T${apt.time}:00`).getTime();
    const nowMs = Date.now();
    const hoursDiff = (aptTimeMs - nowMs) / (1000 * 3600);

    let isDirectReschedule = false;

    if (isCustomer) {
      if (hoursDiff >= 6) {
        // >= 6 Hours: Customer can directly reschedule
        isDirectReschedule = true;
      } else {
        // < 6 Hours: Customer can only submit a reschedule request
        await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'reschedule_requested',
            requestedDate: newDate,
            requestedTime: newTime,
            rescheduleRequestedAt: new Date().toISOString()
          })
        });

        await sendNotification({
          targetUid: apt.customerUid,
          type: 'reschedule_request_sent',
          title: '🔄 Değişiklik Talebi Salona İletildi',
          message: `Randevunuza 6 saatten az kaldığı için ${newDate} @ ${newTime} talebiniz salona iletilmiştir.`,
          appointmentId: aptId,
          businessId: apt.businessId
        });

        return res.status(200).json({
          success: true,
          mode: 'request_submitted',
          message: 'Randevunuza 6 saatten az kaldığı için değişiklik talebiniz salona iletilmiştir.',
          aptId,
          status: 'reschedule_requested'
        });
      }
    } else {
      // Salon Owner or Admin Approval
      isDirectReschedule = true;
    }

    // 4. ATOMIC INTERVAL & 409 CONFLICT CHECK FOR NEW SLOT
    const allAptsRes = await fetch(`${FIREBASE_DB_URL}/appointments.json`);
    const allAptsData = allAptsRes.ok ? await allAptsRes.json() : null;

    if (allAptsData) {
      const duration = parseInt(apt.serviceDuration) || 30;
      const [newH, newM] = newTime.split(':').map(Number);
      const newStartMins = newH * 60 + newM;
      const newEndMins = newStartMins + duration;

      const conflict = Object.values(allAptsData).find(a => {
        if (!a || a.aptId === aptId || a.businessId !== apt.businessId || a.date !== newDate) return false;
        if (a.status === 'cancelled' || a.status === 'rejected') return false;
        if (a.staffId !== apt.staffId && apt.staffId !== 'staff-any' && a.staffId !== 'staff-any') return false;

        const exDuration = parseInt(a.serviceDuration) || 30;
        const [exH, exM] = (a.time || '00:00').split(':').map(Number);
        const exStartMins = exH * 60 + exM;
        const exEndMins = exStartMins + exDuration;

        return (newStartMins < exEndMins && newEndMins > exStartMins);
      });

      if (conflict) {
        return res.status(409).json({
          error: 'Seçilen yeni tarih ve saat aralığında berber doludur. Lütfen başka bir saat seçiniz.'
        });
      }
    }

    // 5. APPLY DIRECT RESCHEDULE & SET APPROVED
    await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: newDate,
        time: newTime,
        status: 'approved',
        requestedDate: null,
        requestedTime: null,
        rescheduleApprovedAt: new Date().toISOString()
      })
    });

    await sendNotification({
      targetUid: apt.customerUid,
      type: 'reschedule_approved',
      title: '✅ Randevu Tarihiniz Güncellendi',
      message: `Randevu tarihiniz ${newDate} @ ${newTime} olarak güncellenmiştir.`,
      appointmentId: aptId,
      businessId: apt.businessId
    });

    return res.status(200).json({
      success: true,
      mode: isDirectReschedule ? 'direct_updated' : 'approved',
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