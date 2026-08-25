/* EZO STİLE v2 - Atomic Appointment Lifecycle Status Update, Completed AI Bonus & Notification Dispatcher Endpoint */
import { sendNotification } from '../notifications/send.js';

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

    const validStatuses = ['pending', 'approved', 'completed', 'rejected', 'cancelled', 'reschedule_requested', 'no_show'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Geçersiz randevu durumu' });
    }

    // 1. FETCH APPOINTMENT & CALLER PROFILE
    const aptRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`);
    const apt = aptRes.ok ? await aptRes.json() : null;

    if (!apt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    const userRes = await fetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = userRes.ok ? await userRes.json() : null;

    if (!user) {
      return res.status(403).json({ error: 'Kullanıcı bulunamadı' });
    }

    // 2. SECURITY GUARD FOR RESTRICTED STATUSES (completed & no_show)
    if (newStatus === 'completed' || newStatus === 'no_show') {
      const isStaffOrAdmin = user.role === 'super_admin' || (user.businessId === apt.businessId && user.role !== 'customer');
      if (!isStaffOrAdmin) {
        console.warn(`[SECURITY ALERT] Customer UID ${userUid} attempted setting status to restricted '${newStatus}'!`);
        return res.status(403).json({ error: `Yalnızca yetkili salon çalışanları randevuyu '${newStatus}' durumuna getirebilir.` });
      }
    }

    // 3. AUTHORIZATION CHECK FOR TENANT / CUSTOMER
    const isCustomerOwner = userUid === apt.customerUid;
    const isTenantStaff = user.businessId === apt.businessId;
    const isSuperAdmin = user.role === 'super_admin';

    if (!isCustomerOwner && !isTenantStaff && !isSuperAdmin) {
      return res.status(403).json({ error: 'Bu randevu üzerinde yetkiniz bulunmamaktadır.' });
    }

    // 4. COMPLETED APPOINTMENT AI BONUS ENGINE (+2 Economy Credits, Idempotent)
    let bonusGrantedThisTime = false;
    if (newStatus === 'completed' && !apt.appointmentAiBonusGranted) {
      const customerRes = await fetch(`${FIREBASE_DB_URL}/users/${apt.customerUid}.json`);
      const customer = customerRes.ok ? await customerRes.json() : null;

      if (customer) {
        const currentCredits = customer.aiCredits || { economy: 3, premium: 1 };
        const updatedCredits = {
          ...currentCredits,
          economy: (currentCredits.economy || 0) + 2
        };
        const currentBonusEarned = customer.bonusEarnedCredits || 0;

        await fetch(`${FIREBASE_DB_URL}/users/${apt.customerUid}.json`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            aiCredits: updatedCredits,
            bonusEarnedCredits: currentBonusEarned + 2
          })
        });

        bonusGrantedThisTime = true;
      }
    }

    // 5. UPDATE APPOINTMENT STATUS IN DB
    const patchPayload = {
      status: newStatus,
      statusUpdatedAt: new Date().toISOString()
    };
    if (bonusGrantedThisTime) {
      patchPayload.appointmentAiBonusGranted = true;
      patchPayload.appointmentAiBonusGrantedAt = new Date().toISOString();
    }

    const updateRes = await fetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patchPayload)
    });

    if (!updateRes.ok) {
      return res.status(500).json({ error: 'Randevu durumu güncellenemedi' });
    }

    // 6. DISPATCH NOTIFICATIONS BASED ON LIFECYCLE EVENT
    if (newStatus === 'approved') {
      await sendNotification({
        targetUid: apt.customerUid,
        type: 'apt_approved',
        title: '✅ Randevunuz Onaylandı!',
        message: `📅 ${apt.date} @ ${apt.time} tarihindeki ${apt.serviceName} randevunuz salon tarafından onaylanmıştır.`,
        appointmentId: aptId,
        businessId: apt.businessId
      });
    } else if (newStatus === 'completed') {
      await sendNotification({
        targetUid: apt.customerUid,
        type: 'apt_completed',
        title: '🎉 Randevunuz Tamamlandı (+2 AI Hakkı Hediye!)',
        message: 'Hizmetiniz tamamlanmıştır. Hesabınıza +2 Economy AI hakkı eklenmiştir!',
        appointmentId: aptId,
        businessId: apt.businessId
      });
    } else if (newStatus === 'cancelled') {
      await sendNotification({
        targetUid: apt.customerUid,
        type: 'apt_cancelled',
        title: '🚫 Randevu İptal Edildi',
        message: 'Randevunuz başarıyla iptal edilmiştir.',
        appointmentId: aptId,
        businessId: apt.businessId
      });
    }

    return res.status(200).json({
      success: true,
      aptId,
      status: newStatus,
      aiBonusGranted: bonusGrantedThisTime
    });

  } catch (err) {
    console.error('Update status API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}