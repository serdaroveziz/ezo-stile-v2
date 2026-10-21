import { eligibleStaffEntries, intervalOverlapsAppointment, staffKey, istanbulNowParts, validBookingDate } from '../../booking-staff.js';
import { publishBookingRevision } from '../../booking-revision.js';
/* UNELIVO - Race-safe 48-hour reschedule request and approval engine */
import { firebaseFetch, getAdminDatabase, transactionWithCurrentValue } from '../../firebase-admin.js';
import { sendNotification } from '../notifications/send.js';
import { hasStaffPermission } from '../../../src/staff-permissions.js';

const FIREBASE_DB_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

async function notifyOwner(business, payload) {
  if (business && business.ownerUid) await sendNotification({ targetUid: business.ownerUid, ...payload });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const { aptId, newDate, newTime, userUid, action } = req.body || {};
    if (!aptId || !userUid) return res.status(400).json({ error: 'aptId ve userUid zorunludur' });
    const [aptRes, userRes] = await Promise.all([
      firebaseFetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`),
      firebaseFetch(`${FIREBASE_DB_URL}/users/${userUid}.json`)
    ]);
    const apt = aptRes.ok ? await aptRes.json() : null;
    const user = req.auth && req.auth.uid === userUid ? req.auth.profile : null;
    if (!apt) return res.status(404).json({ error: 'Randevu bulunamadı' });
    if (!user) return res.status(403).json({ error: 'Kullanıcı bulunamadı' });
    const isCustomer = userUid === apt.customerUid;
    const assignedStaffIds = [userUid, `stf_${userUid}`, user.staffId].filter(Boolean);
    const isOwnerOrAdmin = user.role === 'super_admin' || (user.businessId === apt.businessId && ['owner', 'manager', 'receptionist'].includes(user.role)) || (user.businessId === apt.businessId && user.role === 'barber' && assignedStaffIds.includes(apt.staffId));
    if (!isCustomer && !isOwnerOrAdmin) return res.status(403).json({ error: 'Bu randevu üzerinde yetkiniz bulunmamaktadır.' });
    if (!isCustomer && ['manager','receptionist'].includes(user.role) && !hasStaffPermission(user, 'requests.manage')) return res.status(403).json({ error: 'Değişiklik taleplerini yönetme izniniz yok.' });
    const businessRes = await firebaseFetch(`${FIREBASE_DB_URL}/businesses/${apt.businessId}.json`);
    const business = businessRes.ok ? await businessRes.json() : null;

    if (isCustomer && action === 'withdraw') {
      const withdrawnAt = new Date().toISOString();
      let missingRequest = false;
      const withdrawResult = await transactionWithCurrentValue(getAdminDatabase().ref(`appointments/${aptId}`), current => {
        if (!current || (current.rescheduleRequestStatus && current.rescheduleRequestStatus !== 'pending') || !current.requestedDate || !current.requestedTime) {
          missingRequest = true;
          return;
        }
        const restoredStatus = ['pending', 'approved'].includes(current.statusBeforeRequest) ? current.statusBeforeRequest : 'pending';
        return { ...current, status: restoredStatus, requestedDate: null, requestedTime: null, statusBeforeRequest: null, rescheduleRequestStatus: 'withdrawn', rescheduleRequestWithdrawnAt: withdrawnAt, updatedAt: withdrawnAt };
      });
      if (!withdrawResult.committed) return res.status(409).json({ error: missingRequest ? 'Geri çekilebilecek bekleyen değişiklik talebi bulunmuyor.' : 'Değişiklik talebi geri çekilemedi.' });
      await notifyOwner(business, { type: 'reschedule_request_withdrawn', title: '↩️ Değişiklik Talebi Geri Çekildi', message: `${apt.customerName || 'Müşteri'} değişiklik talebini geri çekti. Randevunun mevcut tarihi değişmedi.`, appointmentId: aptId, businessId: apt.businessId, requestId: apt.rescheduleRequestId, targetTab: 'appointments', targetSection: 'reschedule_requests' });
      return res.status(200).json({ success: true, mode: 'request_withdrawn', status: ['pending', 'approved'].includes(apt.statusBeforeRequest) ? apt.statusBeforeRequest : 'pending' });
    }

    if (isOwnerOrAdmin && action === 'reject') {
      if (!apt.requestedDate || !apt.requestedTime) return res.status(409).json({ error: 'Bekleyen tarih değişikliği talebi bulunmuyor.' });
      const rejectedAt = new Date().toISOString();
      let restoredStatus = 'pending';
      const rejectResult = await transactionWithCurrentValue(getAdminDatabase().ref(`appointments/${aptId}`), current => {
        if (!current || (current.rescheduleRequestStatus && current.rescheduleRequestStatus !== 'pending') || !current.requestedDate || !current.requestedTime) return;
        restoredStatus = ['pending', 'approved'].includes(current.statusBeforeRequest) ? current.statusBeforeRequest : 'pending';
        return { ...current, status: restoredStatus, requestedDate: null, requestedTime: null, statusBeforeRequest: null, rescheduleRequestStatus: 'rejected', rescheduleRejectedAt: rejectedAt, updatedAt: rejectedAt };
      });
      if (!rejectResult.committed) return res.status(409).json({ error: 'Bekleyen tarih değişikliği talebi artık mevcut değil.' });
      await sendNotification({ targetUid: apt.customerUid, type: `reschedule_rejected_${rejectedAt}`, title: '↩️ Tarih Değişikliği Talebi Reddedildi', message: `Mevcut randevunuz ${apt.date} @ ${apt.time} olarak devam ediyor.`, appointmentId: aptId, businessId: apt.businessId });
      return res.status(200).json({ success: true, mode: 'request_rejected', status: restoredStatus });
    }

    const targetDate = isOwnerOrAdmin ? (newDate || apt.requestedDate) : newDate;
    const targetTime = isOwnerOrAdmin ? (newTime || apt.requestedTime) : newTime;
    if (!validBookingDate(targetDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(targetTime || ''))) return res.status(400).json({ error: 'Geçerli yeni tarih ve saat zorunludur.' });
    const hoursUntilAppointment = (new Date(`${apt.date}T${apt.time}:00+03:00`).getTime() - Date.now()) / 3600000;

    if (isCustomer && hoursUntilAppointment < 48) {
      const requestedAt = new Date().toISOString();
      const requestId = `req_reschedule_${aptId}_${Date.now()}`;
      const statusBeforeRequest = ['pending', 'approved'].includes(apt.status) ? apt.status : (apt.statusBeforeRequest || 'pending');
      await firebaseFetch(`${FIREBASE_DB_URL}/appointments/${aptId}.json`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'reschedule_requested', statusBeforeRequest, requestedDate: targetDate, requestedTime: targetTime, rescheduleRequestId: requestId, rescheduleRequestStatus: 'pending', rescheduleRequestedAt: requestedAt, updatedAt: requestedAt }) });
      await notifyOwner(business, { type: 'reschedule_request', title: '🔄 Yakın Tarihli Değişiklik Talebi', message: `${apt.customerName || 'Müşteri'}, ${apt.date} @ ${apt.time} randevusunu ${targetDate} @ ${targetTime} olarak değiştirmek istiyor.`, appointmentId: aptId, businessId: apt.businessId, requestId, targetTab: 'appointments', targetSection: 'reschedule_requests' });
      await sendNotification({ targetUid: apt.customerUid, type: `reschedule_request_sent_${requestedAt}`, title: '🔄 Değişiklik Talebi Salona İletildi', message: 'Randevuya 48 saatten az kaldığı için salon onayı bekleniyor.', appointmentId: aptId, businessId: apt.businessId });
      return res.status(200).json({ success: true, mode: 'request_submitted', status: 'reschedule_requested', requiresExternalNotice: true, businessNotificationPhone: business ? (business.whatsappPhone || business.notificationPhone || business.phone || '') : '' });
    }

    const duration = Number(apt.serviceDuration || apt.durationMinutes) || 30;
    const [newH, newM] = targetTime.split(':').map(Number);
    const newStart = newH * 60 + newM, newEnd = newStart + duration;
    const finalStatus = isOwnerOrAdmin
      ? (['pending', 'approved'].includes(apt.statusBeforeRequest) ? apt.statusBeforeRequest : (apt.status === 'pending' ? 'pending' : 'approved'))
      : (apt.status === 'approved' ? 'approved' : 'pending');
    const changedAt = new Date().toISOString();
    let targetConflict = false;
    const updateResult = await transactionWithCurrentValue(getAdminDatabase().ref('appointments'), current => {
      if (!current || !current[aptId]) return;
      const clock=istanbulNowParts();
      if (targetDate<clock.date || (targetDate===clock.date && newStart<=clock.minutes) || !business || !eligibleStaffEntries(business,apt.serviceId,targetDate,newStart,newEnd).some(entry=>staffKey(entry)===apt.staffId)) { targetConflict=true; return; }
      if (JSON.stringify(current[aptId])!==JSON.stringify(apt)) { targetConflict=true; return; }
      const conflict = Object.entries(current).find(([otherId, other]) => otherId!==aptId && intervalOverlapsAppointment(other,apt.businessId,targetDate,apt.staffId,newStart,newEnd,business));
      if (conflict) {
        targetConflict = true;
        return;
      }
      current[aptId] = { ...current[aptId], date: targetDate, time: targetTime, startTime: targetTime, status: finalStatus, requestedDate: null, requestedTime: null, statusBeforeRequest: null, rescheduleRequestStatus: isOwnerOrAdmin ? 'approved' : current[aptId].rescheduleRequestStatus || null, rescheduleApprovedAt: changedAt, updatedAt: changedAt };
      return current;
    });
    if (!updateResult.committed) {
      return res.status(targetConflict ? 409 : 404).json({ error: targetConflict ? 'Seçilen yeni tarih ve saat aralığında berber doludur. Lütfen başka bir saat seçiniz.' : 'Randevu bulunamadı.' });
    }
    await publishBookingRevision(apt.businessId);
    await sendNotification({ targetUid: apt.customerUid, type: `reschedule_applied_${changedAt}`, title: '✅ Randevu Tarihiniz Güncellendi', message: `Randevunuz ${targetDate} @ ${targetTime} olarak güncellendi.`, appointmentId: aptId, businessId: apt.businessId });
    await notifyOwner(business, { type: `reschedule_applied_owner_${changedAt}`, title: '📅 Randevu Tarihi Güncellendi', message: `${apt.customerName || 'Müşteri'} randevusu ${targetDate} @ ${targetTime} olarak güncellendi.`, appointmentId: aptId, businessId: apt.businessId });
    return res.status(200).json({ success: true, mode: isOwnerOrAdmin ? 'request_approved' : 'direct_updated', aptId, date: targetDate, time: targetTime, status: finalStatus });
  } catch (error) {
    console.error('Reschedule approve API error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
