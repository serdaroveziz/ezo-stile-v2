import { employeeSalonError } from '../../staff-tenant.js';
/* UNELIVO - Privacy-safe booking availability endpoint */
import { getAdminDatabase } from '../../firebase-admin.js';
import { hasStaffPermission } from '../../../src/staff-permissions.js';
import { chooseAvailableStaff, eligibleStaffEntries, scheduleForDate, toMinutes, staffKey, intervalOverlapsAppointment, istanbulNowParts, validBookingDate, bookingService, bookingDuration } from '../../booking-staff.js';

// Both roles, explicit staff and Any Staff use this same eligibility/overlap engine.
export function buildAnyStaffAvailability({ business, businessId, serviceId, staffId = 'staff-any', appointments = [], date, durationMinutes, now = new Date() }) {
  const entries = eligibleStaffEntries(business, serviceId, date);
  const selected = entries.find(entry => staffKey(entry) === staffId || entry[0] === staffId);
  const schedule = scheduleForDate(business, selected?.[1] || null, date);
  const opening = toMinutes(schedule.start), closing = toMinutes(schedule.end);
  const duration = Number(durationMinutes);
  const current = istanbulNowParts(now);
  const slots=[], candidateSlots=[], pastSlots=[], busySlots=[], staffBySlot={};
  const isClosed = schedule.isClosed || (staffId !== 'staff-any' && !selected);
  if (!isClosed && duration >= 15 && duration <= 240) {
    for (let start=opening; start<closing; start+=30) {
      const label=String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0');
      if (date<current.date || (date===current.date && start<=current.minutes)) { pastSlots.push(label); continue; }
      const available = end => eligibleStaffEntries(business,serviceId,date,start,end)
        .filter(entry => staffId==='staff-any' || staffKey(entry)===staffKey(selected))
        .filter(entry => !appointments.some(a => intervalOverlapsAppointment(a,businessId,date,staffKey(entry),start,end,business)))
        .map(staffKey);
      if (available(start+1).length) candidateSlots.push(label);
      if (start+duration>closing) continue;
      const ids=available(start+duration);
      if (ids.length) { slots.push(label); staffBySlot[label]=ids; } else busySlots.push(label);
    }
  }
  return {isClosed,slots,candidateSlots,pastSlots,busySlots,staffBySlot,nextAvailableTime:slots[0]||null,openingTime:schedule.start,closingTime:schedule.end,slotIntervalMinutes:30,serverDate:current.date,serverMinutes:current.minutes};
}

export function availableStaffBySlot({business,businessId,serviceId,date,durationMinutes,appointments,slots}) {
  return Object.fromEntries(slots.map(time => {
    const start=toMinutes(time),end=start+durationMinutes;
    const ids=eligibleStaffEntries(business,serviceId,date,start,end).filter(entry=>!appointments.some(a=>intervalOverlapsAppointment(a,businessId,date,staffKey(entry),start,end,business))).map(staffKey);
    return [time,ids];
  }));
}

export async function handleAvailabilityWithDatabase(req, res, db) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const { businessId, staffId, serviceId, date, durationMinutes, customerPhone, isManual, findNextAvailable, internalView } = req.body || {};
  if (!businessId || !staffId || !serviceId || !validBookingDate(date)) {
    return res.status(400).json({ error: 'Salon, hizmet, personel ve tarih zorunludur.' });
  }
  const parsedDate=new Date(date+'T12:00:00Z');
  if(!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==date)return res.status(400).json({error:'Geçersiz tarih.'});
  const scopeError=employeeSalonError(req.auth,businessId);
  if(scopeError)return res.status(403).json({error:scopeError});
  const businessSnapshot=await db.ref(`businesses/${businessId}`).get();
  if (!businessSnapshot.exists()) return res.status(404).json({ error: 'Salon bulunamadı.' });
  const business = businessSnapshot.val();
  const membershipError=employeeSalonError(req.auth,businessId,business);
  if(membershipError)return res.status(403).json({error:membershipError});
  const profile = req.auth && req.auth.profile ? req.auth.profile : {};
  const canCreateManual = Boolean(isManual) && (profile.role === 'super_admin' || (profile.role === 'owner' && profile.businessId === businessId) ||
    (['manager','receptionist','barber'].includes(profile.role) && profile.businessId === businessId && hasStaffPermission(profile, 'appointments.create')));
  const canViewInternal = profile.businessId === businessId && ['owner','manager','receptionist','barber'].includes(profile.role);
  if (internalView && !canViewInternal) return res.status(403).json({error:'Salon takvimini görüntüleme izniniz yok.'});
  if (isManual && !canCreateManual) return res.status(403).json({ error: 'Manuel randevu oluşturma izniniz yok.' });
  if (business.status === 'suspended' || (business.bookingEnabled === false && !canCreateManual && !(internalView && canViewInternal))) {
    return res.status(409).json({ error: 'Salon şu anda online randevu kabul etmiyor.', isClosed: true, slots: [] });
  }
  const businessStaff = business.staff ? Object.values(business.staff).filter(Boolean) : [];
  const staff = staffId === 'staff-any'
    ? null
    : ((business.staff && business.staff[staffId]) || businessStaff.find(item => item.id === staffId));
  if (staffId !== 'staff-any' && (!staff || staff.active === false)) return res.status(404).json({ error: 'Personel bulunamadı.' });
  const appointmentsSnapshot=await db.ref('appointments').orderByChild('businessId').equalTo(businessId).get();
  const allAppointments = appointmentsSnapshot.exists() ? Object.values(appointmentsSnapshot.val()).filter(Boolean) : [];
  const appointments = allAppointments.filter(appointment => appointment.businessId === businessId);
  const service=bookingService(business,serviceId);
  if(!service)return res.status(404).json({error:'Hizmet bulunamadı.'});
  const duration=bookingDuration(service);
  if(duration===null)return res.status(400).json({error:'Hizmet süresi geçersiz.'});
  const canonicalStaffId=staff ? staffKey([staffId,staff]) : 'staff-any';
  const make = day => ({...buildAnyStaffAvailability({business,businessId,serviceId,staffId:canonicalStaffId,appointments:appointments.filter(appointment=>appointment.date===day),date:day,durationMinutes:duration}),date:day});
  let result=make(date);
  if(findNextAvailable===true&&!result.slots.length){
    for(let offset=1;offset<=60;offset++){
      const next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+offset);
      const candidate=make(next.toISOString().slice(0,10));
      if(candidate.slots.length){result={...candidate,advancedFrom:date,advanceReason:result.isClosed?'closed':'no_slots'};break;}
    }
    if(!result.slots.length)result.searchExhausted=true;
  }
  if(canonicalStaffId!=='staff-any'){
    const any=buildAnyStaffAvailability({business,businessId,serviceId,staffId:'staff-any',appointments,date:result.date,durationMinutes:duration});
    const names=new Map(eligibleStaffEntries(business,serviceId,result.date).map(entry=>[staffKey(entry),String(entry[1].displayName||entry[1].name||'Çalışan').slice(0,100)]));
    result.alternativesBySlot=Object.fromEntries(any.slots.filter(time=>!result.slots.includes(time)).map(time=>[time,any.staffBySlot[time].map(id=>names.get(id)||'Çalışan')]));
  }else result.alternativesBySlot={};
  return res.status(200).json(result);
}

export default async function handler(req, res) {
  return handleAvailabilityWithDatabase(req, res, getAdminDatabase());
}
