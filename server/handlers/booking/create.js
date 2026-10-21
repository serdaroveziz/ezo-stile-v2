import { employeeSalonError } from '../../staff-tenant.js';
import { publishBookingRevision } from '../../booking-revision.js';
/* UNELIVO - Serverless Booking Engine with Manual Booking, Price Snapshots, Weekly Schedule & Booking Enabled Guards */
import { getAdminDatabase } from '../../firebase-admin.js';
import { sendPushToUser as defaultSendPushToUser } from '../../push-notifications.js';
import { sendNotification as defaultSendNotification } from '../notifications/send.js';
import { chooseAvailableStaff, eligibleStaffEntries, intervalOverlapsAppointment, staffCanProvideService, staffKey, istanbulNowParts, validBookingDate, bookingService, bookingDuration } from '../../booking-staff.js';

export function createBookingHandler({ database = getAdminDatabase, publishRevision = publishBookingRevision, push = defaultSendPushToUser, notify = defaultSendNotification } = {}) {
 const sendPushToUser = push, sendNotification = notify;
 return async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { businessId, customerUid, customerName, customerPhone, staffId, staffName,
      serviceId,
      serviceName,
      servicePrice,
      serviceDuration,
      serviceNameSnapshot,
      servicePriceSnapshot,
      durationMinutes,
      date,
      time,
      isManual
    } = req.body || {};

    if (!businessId || !staffId || !serviceId || !date || !time) {
      return res.status(400).json({ error: 'Eksik randevu bilgileri' });
    }
    if (!validBookingDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(String(time))) {
      return res.status(400).json({ error: 'Geçerli tarih ve saat zorunludur.' });
    }

    // 1. SALON PROFILE & BOOKING ENABLED GUARDS
    const scopeError=employeeSalonError(req.auth,businessId);
    if(scopeError)return res.status(403).json({error:scopeError});
    const db = database();
    const businessSnapshot = await db.ref(`businesses/${businessId}`).get();
    const biz = businessSnapshot.exists() ? businessSnapshot.val() : null;

    if (!biz) return res.status(404).json({ error: 'Salon bulunamadı.' });
    const membershipError=employeeSalonError(req.auth,businessId,biz);
    if(membershipError)return res.status(403).json({error:membershipError});
    if (biz) {
      if (biz.status === 'suspended') {
        return res.status(403).json({ error: 'Bu salon şu anda askıya alınmıştır. Yeni randevu oluşturulamaz.' });
      }

      // ONLINE BOOKING CLOSED CHECK (Bypassed for Manual Bookings)
      if (biz.bookingEnabled === false && !isManual) {
        return res.status(403).json({ error: 'Bu salon şu anda online randevu kabul etmiyor.' });
      }

    }

    // 2. BACKEND INTERVAL OVERLAP CHECK (startTime -> endTime)
    const serviceEntries = Object.entries(biz.services || {}).filter(([, item]) => item && item.active !== false);
    const selectedServiceEntry = serviceEntries.find(([key, item]) => key === serviceId || item.id === serviceId || item.serviceId === serviceId);
    if (!selectedServiceEntry) return res.status(404).json({ error: 'Hizmet bulunamadı veya aktif değil.' });
    const selectedService = selectedServiceEntry ? selectedServiceEntry[1] : null;
    const effectiveServiceName = selectedService ? (selectedService.name || selectedService.title || 'Hizmet') : (serviceName || serviceNameSnapshot || 'Hizmet');
    const effectiveServicePrice = selectedService ? Number(selectedService.price || 0) : (Number(servicePrice ?? servicePriceSnapshot) || 350);
    const effectiveDurationMinutes = bookingDuration(selectedService);
    if (!Number.isFinite(effectiveServicePrice) || effectiveServicePrice < 0 || !Number.isFinite(effectiveDurationMinutes) || effectiveDurationMinutes < 15 || effectiveDurationMinutes > 240) {
      return res.status(400).json({ error: 'Hizmet fiyatı veya süresi geçersiz.' });
    }
    if(req.assistantContext && req.auth?.uid && req.assistantContext.uid===req.auth.uid && (req.assistantContext.expectedPrice!==effectiveServicePrice || req.assistantContext.expectedDuration!==effectiveDurationMinutes)) return res.status(409).json({error:'Hizmet bilgileri değişti; asistan taslağını yeniden hazırlayın.'});
    const staffEntries = Object.entries(biz.staff || {}).filter(([, item]) => item && item.active !== false);
    const selectedStaffEntry = staffId === 'staff-any' ? null : staffEntries.find(([key, item]) => key === staffId || item.id === staffId || item.userId === staffId);
    if (staffId !== 'staff-any' && !selectedStaffEntry) return res.status(404).json({ error: 'Personel bulunamadı veya aktif değil.' });
    if (selectedStaffEntry && !staffCanProvideService(selectedStaffEntry[1], serviceId, biz)) return res.status(409).json({ error: 'Seçilen uzman bu hizmeti vermiyor.' });
    const [startH, startM] = time.split(':').map(Number);
    const newStartMins = startH * 60 + startM;
    const newEndMins = newStartMins + effectiveDurationMinutes;

    const { date: today, minutes: nowMinutes } = istanbulNowParts();
    if (date < today || (date === today && newStartMins <= nowMinutes)) return res.status(409).json({ error: 'Geçmiş tarih veya saate randevu oluşturulamaz.' });

    const endH = Math.floor(newEndMins / 60);
    const endM = newEndMins % 60;
    const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

    const allAptsSnapshot = await db.ref('appointments').orderByChild('businessId').equalTo(businessId).get();
    const allAptsData = allAptsSnapshot.exists() ? allAptsSnapshot.val() : null;
    const allApts = allAptsData ? Object.values(allAptsData) : [];

    // 3. NEW CUSTOMER ATTRIBUTION CHECK
    let effectiveCustomerUid = customerUid || ('usr_manual_' + Date.now());
    if (isManual && customerPhone) {
      const usersSnapshot = await db.ref('users').get();
      const usersData = usersSnapshot.exists() ? usersSnapshot.val() : null;
      const normalizePhone = value => String(value || '').replace(/\D/g, '').slice(-10);
      const targetPhone = normalizePhone(customerPhone);
      if (usersData && targetPhone.length === 10) {
        const matchedUser = Object.entries(usersData).find(([, profile]) => profile && normalizePhone(profile.phone) === targetPhone);
        if (matchedUser) effectiveCustomerUid = matchedUser[0];
      }
    }
    const priorCompletedApt = allApts.find(apt => 
      apt &&
      apt.customerUid === effectiveCustomerUid &&
      apt.businessId === businessId &&
      (apt.status === 'approved' || apt.status === 'completed')
    );

    const isNewCustomerForBusiness = !priorCompletedApt;
    const bookingSource = isManual ? 'owner_manual' : 'ezo_discovery';
    const assignedStatus = isManual ? 'approved' : 'pending';

        // 4. SAVE NEW APPOINTMENT RECORD WITH CANONICAL SCHEMA & SNAPSHOTS
    const businessNameSnapshot = biz ? (biz.name || 'EZO Salon') : 'EZO Salon';
    const assistant = req.assistantContext?.uid===req.auth?.uid && /^[-a-f0-9]{36}$/.test(req.assistantContext?.draftId||'') ? req.assistantContext : null;
    const aptId = assistant ? 'apt_ai_'+assistant.draftId : 'apt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    let assistantReplay=false;
    let appointmentRecord = {
      appointmentId: aptId,
      aptId: aptId,
      businessId,
      businessNameSnapshot,
      customerUid: effectiveCustomerUid,
      customerNameSnapshot: (!isManual && req.auth.profile && (req.auth.profile.name || req.auth.profile.displayName)) || customerName || 'Müşteri',
      customerPhoneSnapshot: (!isManual && req.auth.profile && req.auth.profile.phone) || customerPhone || '',
      customerName: (!isManual && req.auth.profile && (req.auth.profile.name || req.auth.profile.displayName)) || customerName || 'Müşteri',
      customerPhone: (!isManual && req.auth.profile && req.auth.profile.phone) || customerPhone || '',
      staffId: staffId === 'staff-any' ? null : staffKey(selectedStaffEntry),
      staffNameSnapshot: selectedStaffEntry ? (selectedStaffEntry[1].displayName || selectedStaffEntry[1].name || 'Uzman') : null,
      staffName: selectedStaffEntry ? (selectedStaffEntry[1].displayName || selectedStaffEntry[1].name || 'Uzman') : null,
      serviceId,
      serviceNameSnapshot: effectiveServiceName,
      serviceName: effectiveServiceName,
      servicePriceSnapshot: effectiveServicePrice,
      servicePrice: effectiveServicePrice,
      durationMinutes: effectiveDurationMinutes,
      serviceDuration: effectiveDurationMinutes,
      date,
      time,
      startTime: time,
      endTime: endTimeStr,
      status: assignedStatus,
      source: bookingSource,
      isManual: Boolean(isManual),
      isNewCustomerForBusiness,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Müsaitlik denetimi ve kayıt aynı RTDB transaction'ında yapılır. Böylece
    // müşteri ve manuel akış aynı anda aynı aralığı ayıramaz.
    let conflictAptId = null;
    const saveResult = await db.ref('appointments').transaction(current => {
      assistantReplay=false;
      if(assistant&&current?.[aptId]){appointmentRecord=current[aptId];assistantReplay=true;return current;}
      const clock = istanbulNowParts();
      if (date < clock.date || (date === clock.date && newStartMins <= clock.minutes)) return;
      const appointments = current || {};
      let assignedEntry = selectedStaffEntry;
      if (staffId === 'staff-any') assignedEntry = chooseAvailableStaff({ business: biz, businessId, serviceId, date, startMinutes: newStartMins, endMinutes: newEndMins, appointments });
      if (!assignedEntry) return;
      const assignedStaffId = staffKey(assignedEntry);
      if (!eligibleStaffEntries(biz, serviceId, date, newStartMins, newEndMins).some(entry => staffKey(entry) === assignedStaffId)) return;
      const conflict = Object.values(appointments).find(apt => intervalOverlapsAppointment(apt, businessId, date, assignedStaffId, newStartMins, newEndMins, biz));
      if (conflict) {
        conflictAptId = conflict.aptId || conflict.appointmentId || null;
        return;
      }
      const assignedName = assignedEntry[1].displayName || assignedEntry[1].name || 'Uzman';
      appointmentRecord = { ...appointmentRecord, staffId: assignedStaffId, staffName: assignedName, staffNameSnapshot: assignedName };
      appointments[aptId] = appointmentRecord;
      return appointments;
    });

    if (!saveResult.committed) {
      return res.status(409).json({
        reason: 'DURATION_UNAVAILABLE',
        error: staffId === 'staff-any' ? `Seçtiğiniz ${time} - ${endTimeStr} aralığında uygun uzman kalmadı.` : `Seçtiğiniz ${time} - ${endTimeStr} aralığında seçili uzman doludur.`,
        conflictAptId
      });
    }

    if(assistantReplay)return res.status(200).json({success:true,aptId,data:appointmentRecord,replayed:true});
    await publishRevision(businessId);

    // 5. ALWAYS CREATE AN IN-APP OWNER NOTIFICATION.
    // WhatsApp/SMS is an optional customer action; this record is the reliable fallback.
    if (biz && biz.ownerUid) {
      const notificationId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const notificationRecord = {
        notificationId,
        type: 'new_booking',
        title: 'Yeni Randevu Talebi',
        message: `${customerName || 'Müşteri'} • ${effectiveServiceName} • ${date} ${time}`,
        appointmentId: aptId,
        businessId,
        targetTab: 'appointments',
        targetSection: isManual ? 'approved' : 'pending',
        read: false,
        createdAt: new Date().toISOString()
      };
      try {
        await db.ref(`notifications/${biz.ownerUid}/${notificationId}`).set(notificationRecord);
      } catch (notificationError) {
        console.error('Owner in-app notification could not be saved:', notificationError);
      }
      sendPushToUser(biz.ownerUid, { type:'new_booking', title:'Yeni Randevu', message:'Salonunuza yeni bir randevu talebi geldi.', appointmentId:aptId, businessId, eventId:`appointment:${aptId}:created`, link:'/?notification=1' }).catch(error => console.error('Owner push failed:', error));
    }
    const assignedStaff = Object.values((biz && biz.staff) || {}).find(member => member && (member.id === appointmentRecord.staffId || member.staffId === appointmentRecord.staffId));
    if (assignedStaff && assignedStaff.userId && assignedStaff.userId !== biz.ownerUid) {
      sendNotification({ targetUid:assignedStaff.userId, type:'new_assigned_booking', title:'Yeni Randevu', message:'Size yeni bir randevu atandı.', appointmentId:aptId, businessId, requestId:`appointment:${aptId}:staff-assigned`, targetTab:'today' }).catch(error => console.error('Staff notification failed:', error));
    }
    if (!isManual && customerUid) {
      sendNotification({ targetUid:customerUid, type:'appointment_created', title:'Randevu Talebiniz Oluşturuldu', message:`${date} ${time} tarihli randevu talebiniz salon onayına gönderildi.`, appointmentId:aptId, businessId, requestId:`appointment:${aptId}:customer-created`, targetTab:'appointments' }).catch(error => console.error('Customer notification failed:', error));
    }

        // 6. RETURN CANONICAL SUCCESS RESPONSE
    return res.status(200).json({
      success: true,
      appointmentId: aptId,
      aptId: aptId,
      businessNotificationPhone: biz ? (biz.notificationPhone || biz.whatsappPhone || biz.phone || '') : '',
      message: 'Randevunuz başarıyla oluşturuldu.',
      data: appointmentRecord
    });

  } catch (err) {
    console.error('Booking create API error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

}
export default createBookingHandler();
