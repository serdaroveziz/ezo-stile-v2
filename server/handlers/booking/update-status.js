import { publishBookingRevision } from '../../booking-revision.js';
﻿/* UNELIVO - Atomic Appointment Lifecycle Status Update, Completed AI Bonus & Notification Dispatcher Endpoint */
import { sendNotification } from '../notifications/send.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';
import { firebaseFetch, getAdminDatabase, transactionWithCurrentValue } from '../../firebase-admin.js';
import { hasStaffPermission } from '../../../src/staff-permissions.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { aptId, newStatus, userUid } = req.body || {};

    if (!aptId || !newStatus || !userUid) {
      return res.status(400).json({ error: 'aptId, newStatus ve userUid zorunludur' });
    }

    const validStatuses = ['pending', 'approved', 'completed', 'rejected', 'cancelled', 'cancel_requested', 'reschedule_requested', 'no_show'];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: 'Geçersiz randevu durumu' });
    }

    // 1. FETCH APPOINTMENT & CALLER PROFILE
    const aptRes = await firebaseFetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`);
    const apt = aptRes.ok ? await aptRes.json() : null;

    if (!apt) {
      return res.status(404).json({ error: 'Randevu bulunamadı' });
    }

    const userRes = await firebaseFetch(`${FIREBASE_DB_URL}/users/${userUid}.json`);
    const user = req.auth && req.auth.uid === userUid ? req.auth.profile : null;

    if (!user) {
      return res.status(403).json({ error: 'Kullanıcı bulunamadı' });
    }

    // 2. SECURITY GUARDS
    // Customer cannot directly set status to 'cancelled', 'completed', or 'no_show'
    if (user.role === 'customer' && (newStatus === 'cancelled' || newStatus === 'completed' || newStatus === 'no_show')) {
      console.warn(`[SECURITY ALERT] Customer UID ${userUid} attempted setting status to restricted '${newStatus}'!`);
      return res.status(403).json({
        error: newStatus === 'cancelled'
          ? 'Müşteriler randevuyu doğrudan iptal edemez. İptal talebi göndermelisiniz.'
          : `Yalnızca yetkili salon çalışanları randevuyu '${newStatus}' durumuna getirebilir.`
      });
    }

    if (newStatus === 'completed' || newStatus === 'no_show') {
      const isStaffOrAdmin = user.role === 'super_admin' || (user.businessId === apt.businessId && user.role !== 'customer');
      if (!isStaffOrAdmin) {
        return res.status(403).json({ error: `Yalnızca yetkili salon çalışanları randevuyu '${newStatus}' durumuna getirebilir.` });
      }
    }

    // 3. AUTHORIZATION CHECK FOR TENANT / CUSTOMER
    const isCustomerOwner = userUid === apt.customerUid;
    const isTenantStaff = user.businessId === apt.businessId && ['owner', 'manager', 'barber', 'receptionist'].includes(user.role);
    const isSuperAdmin = user.role === 'super_admin';
    const isAssignedBarber = user.role !== 'barber' || [userUid, `stf_${userUid}`, user.staffId].filter(Boolean).includes(apt.staffId);

    if (user.role === 'barber') {
      if (!isAssignedBarber) return res.status(403).json({ error: 'Yalnız kendi randevularınızı yönetebilirsiniz.' });
      if (newStatus === 'completed' && !hasStaffPermission(user, 'appointments.own.complete')) return res.status(403).json({ error: 'Randevuyu tamamlama izniniz yok.' });
      if (newStatus === 'no_show' && !hasStaffPermission(user, 'appointments.no_show')) return res.status(403).json({ error: 'No-show işaretleme izniniz yok.' });
    }
    if (['manager','receptionist'].includes(user.role) && ['approved','rejected','cancelled','completed','no_show'].includes(newStatus)) {
      const requiredPermission = apt.status === 'cancel_requested' ? 'requests.manage' : 'appointments.manage';
      if (!hasStaffPermission(user, requiredPermission)) return res.status(403).json({ error: requiredPermission === 'requests.manage' ? 'İptal taleplerini yönetme izniniz yok.' : 'Randevu yönetme izniniz yok.' });
    }

    if (!isCustomerOwner && !(isTenantStaff && isAssignedBarber) && !isSuperAdmin) {
      return res.status(403).json({ error: 'Bu randevu üzerinde yetkiniz bulunmamaktadır.' });
    }

    if (user.role==='customer' && !['cancel_requested','reschedule_requested'].includes(newStatus)) return res.status(403).json({error:'Müşteri yalnızca iptal veya değişiklik talebi gönderebilir.'});
    if (['cancelled','rejected','completed','expired','no_show'].includes(apt.status)) return res.status(409).json({error:'Sonlandırılmış randevu yeniden açılamaz.'});
    let effectiveStatus = newStatus;
    let cancellationMode = null;
    let business = null;
    const patchPayload = {
      status: effectiveStatus,
      statusUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (newStatus === 'cancel_requested' && isCustomerOwner) {
      patchPayload.cancelRequestId = `req_cancel_${aptId}_${Date.now()}`;
      patchPayload.cancelRequestStatus = cancellationMode === 'request_submitted' ? 'pending' : 'approved';
      const appointmentStartMs = new Date(`${apt.date}T${apt.time}:00+03:00`).getTime();
      const hoursUntilAppointment = (appointmentStartMs - Date.now()) / 3600000;
      const businessRes = await firebaseFetch(`${FIREBASE_DB_URL}/businesses/${apt.businessId}.json`);
      business = businessRes.ok ? await businessRes.json() : null;
      if (hoursUntilAppointment >= 48) {
        effectiveStatus = 'cancelled';
        cancellationMode = 'direct_cancelled';
      } else {
        effectiveStatus = 'cancel_requested';
        cancellationMode = 'request_submitted';
      }
    }

    // An owner approval must not erase a concurrent customer reschedule request.
    if (newStatus === 'approved' && apt.requestedDate && apt.requestedTime) {
      effectiveStatus = 'reschedule_requested';
    }

    // 4. COMPLETED APPOINTMENT AI BONUS ENGINE (+2 Economy Credits, Idempotent)
    let bonusGrantedThisTime = false;
    if (newStatus === 'completed' && !apt.appointmentAiBonusGranted) {
      const customerRes = await firebaseFetch(`${FIREBASE_DB_URL}/users/${apt.customerUid}.json`);
      const customer = customerRes.ok ? await customerRes.json() : null;

      if (customer) {
        const currentCredits = customer.aiCredits || { economy: 3, premium: 1 };
        const updatedCredits = {
          ...currentCredits,
          economy: (currentCredits.economy || 0) + 2
        };
        const currentBonusEarned = customer.bonusEarnedCredits || 0;

        await firebaseFetch(`${FIREBASE_DB_URL}/users/${apt.customerUid}.json`, {
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
    patchPayload.status = effectiveStatus;
    if (newStatus === 'cancel_requested' && isCustomerOwner) {
      patchPayload.statusBeforeRequest = cancellationMode === 'request_submitted'
        ? (['pending', 'approved'].includes(apt.status) ? apt.status : (apt.statusBeforeRequest || 'pending'))
        : null;
      patchPayload.cancelRequestedAt = new Date().toISOString();
      if (cancellationMode === 'direct_cancelled') patchPayload.cancelledBy = 'customer_48h_policy';
    }
    if (newStatus === 'approved' && effectiveStatus === 'reschedule_requested') patchPayload.appointmentApprovalStatus = 'approved';
    if (newStatus === 'approved' && apt.status === 'cancel_requested' && !apt.requestedDate) {
      patchPayload.statusBeforeRequest = null;
      patchPayload.cancelRequestStatus = 'rejected';
      patchPayload.cancelRequestRejectedAt = new Date().toISOString();
    }
    if (newStatus === 'cancelled' && apt.status === 'cancel_requested') {
      patchPayload.cancelRequestStatus = 'approved';
      patchPayload.cancelRequestApprovedAt = new Date().toISOString();
    }
    if (bonusGrantedThisTime) {
      patchPayload.appointmentAiBonusGranted = true;
      patchPayload.appointmentAiBonusGrantedAt = new Date().toISOString();
    }

    const updateResult = await transactionWithCurrentValue(getAdminDatabase().ref('appointments'), current => {
      if (!current || JSON.stringify(current[aptId]) !== JSON.stringify(apt)) return;
      current[aptId] = {...current[aptId], ...patchPayload};
      return current;
    });
    if (!updateResult.committed) return res.status(409).json({error:'Randevu değişti; güncel kaydı tekrar açınız.'});

    await publishBookingRevision(apt.businessId);

    // 6. DISPATCH NOTIFICATIONS BASED ON LIFECYCLE EVENT
    const cancelRequestRejected = apt.status === 'cancel_requested' && ['pending', 'approved'].includes(newStatus);
    if (cancelRequestRejected) {
      await sendNotification({
        targetUid: apt.customerUid,
        type: `cancel_request_rejected_${Date.now()}`,
        title: '↩️ İptal Talebi Reddedildi',
        message: `Randevunuz ${apt.date} @ ${apt.time} için devam ediyor.`,
        appointmentId: aptId,
        businessId: apt.businessId
      });
    } else if (newStatus === 'approved') {
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
    } else if (newStatus === 'rejected') {
      await sendNotification({ targetUid:apt.customerUid, type:'apt_rejected', title:'Randevu Talebi Reddedildi', message:'Randevu talebiniz salon tarafından reddedildi.', appointmentId:aptId, businessId:apt.businessId, requestId:`appointment:${aptId}:rejected` });
    } else if (effectiveStatus === 'cancelled') {
      await sendNotification({
        targetUid: apt.customerUid,
        type: 'apt_cancelled',
        title: '🚫 Randevu İptal Edildi',
        message: 'Randevunuz iptal edilmiştir.',
        appointmentId: aptId,
        businessId: apt.businessId
      });
    } else if (effectiveStatus === 'cancel_requested') {
      await sendNotification({
        targetUid: apt.customerUid,
        type: 'apt_cancel_requested',
        title: '📩 İptal Talebi Gönderildi',
        message: 'Randevu iptal talebiniz salona iletilmiştir. Yanıt beklenmektedir.',
        appointmentId: aptId,
        businessId: apt.businessId
      });
    }

    if (newStatus === 'cancel_requested' && isCustomerOwner && business && business.ownerUid) {
      const direct = cancellationMode === 'direct_cancelled';
      await sendNotification({
        targetUid: business.ownerUid,
        type: direct ? 'customer_direct_cancel' : 'cancel_request',
        title: direct ? '🚫 Müşteri Randevuyu İptal Etti' : '📩 Yakın Tarihli İptal Talebi',
        message: direct
          ? `${apt.customerName || 'Müşteri'} ${apt.date} @ ${apt.time} randevusunu 48 saatten önce iptal etti.`
          : `${apt.customerName || 'Müşteri'} ${apt.date} @ ${apt.time} randevusu için iptal onayı istiyor.`,
        appointmentId: aptId,
        businessId: apt.businessId,
        requestId: patchPayload.cancelRequestId,
        targetTab: 'appointments',
        targetSection: direct ? 'cancelled' : 'cancel_requests'
      });
    }

    return res.status(200).json({
      success: true,
      aptId,
      status: effectiveStatus,
      mode: cancellationMode,
      requiresExternalNotice: cancellationMode === 'request_submitted',
      businessNotificationPhone: business ? (business.whatsappPhone || business.notificationPhone || business.phone || '') : '',
      aiBonusGranted: bonusGrantedThisTime
    });

  } catch (err) {
    console.error('Update status API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
