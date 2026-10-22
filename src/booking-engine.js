const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function toMinutes(value, fallback = '00:00') {
  const match = String(value || fallback).match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

export function staffKey(entry) {
  return String(entry[1].id || entry[1].staffId || entry[1].userId || entry[0]);
}

import { staffCanProvideService } from './booking-selection.js';
export { staffCanProvideService, serviceAliasesForBusiness } from './booking-selection.js';

export function scheduleForDate(business, staff, date) {
  const dayIndex = new Date(`${date}T12:00:00Z`).getUTCDay();
  const dayKey = DAY_KEYS[dayIndex];
  const salonSchedule = business.weeklySchedule || {};
  const staffSchedule = staff && staff.weeklySchedule ? staff.weeklySchedule : {};
  const salonDay = salonSchedule[dayKey] || salonSchedule[String(dayIndex === 0 ? 7 : dayIndex)] || salonSchedule;
  const staffDay = staffSchedule[dayKey] || staffSchedule[String(dayIndex === 0 ? 7 : dayIndex)] || null;
  const selected = staffDay || salonDay || {};
  const timeOff = staff && staff.timeOff;
  const isOnLeave = Boolean((Array.isArray(timeOff) && timeOff.includes(date)) || (timeOff && timeOff[date]));
  return {
    isClosed: isOnLeave || selected.isOpen === false || selected.active === false || salonDay.isOpen === false || salonDay.active === false,
    start: [selected.start || selected.openTime || '00:00',salonDay.start || salonDay.openTime || '09:00'].sort((a,b)=>toMinutes(a)-toMinutes(b)).at(-1),
    end: [selected.end || selected.closeTime || '23:59',salonDay.end || salonDay.closeTime || '20:00'].sort((a,b)=>toMinutes(a)-toMinutes(b))[0],
    breaks: [...(Array.isArray(salonDay.breaks)?salonDay.breaks:[]),...(staffDay&&Array.isArray(staffDay.breaks)?staffDay.breaks:[])]
  };
}

export function intervalOverlapsAppointment(appointment, businessId, date, staffId, startMinutes, endMinutes, business = null) {
  if (!appointment || appointment.businessId !== businessId || appointment.date !== date) return false;
  if (['cancelled', 'rejected', 'no_show', 'completed', 'expired'].includes(appointment.status)) return false;
  const requested = String(staffId);
  const entry = Object.entries(business?.staff || {}).find(([key, member]) => member && [key, member.id, member.staffId, member.userId].filter(Boolean).map(String).includes(requested));
  const aliases = new Set([requested, ...(entry ? [entry[0], entry[1].id, entry[1].staffId, entry[1].userId] : [])].filter(Boolean).map(String));
  const assigned = [appointment.staffId, appointment.staffUid, appointment.staffUserId].filter(Boolean).map(String);
  // Legacy unassigned/any-staff records cannot safely be treated as free.
  if (assigned.length && !assigned.includes('staff-any') && !assigned.some(id => aliases.has(id))) return false;
  const existingStart = toMinutes(appointment.time || appointment.startTime);
  const duration = Number(appointment.serviceDuration || appointment.durationMinutes || appointment.durationMin || appointment.duration);
  const savedEnd = appointment.endTime ? toMinutes(appointment.endTime) : 0;
  const existingEnd = Math.max(existingStart + (Number.isFinite(duration) && duration > 0 ? duration : 30), savedEnd);
  return startMinutes < existingEnd && endMinutes > existingStart;
}

export function eligibleStaffEntries(business, serviceId, date, startMinutes = null, endMinutes = null) {
  return Object.entries(business.staff || {}).filter((entry) => {
    const staff = entry[1];
    if (!staff || staff.active === false || !staffCanProvideService(staff, serviceId, business)) return false;
    const schedule = scheduleForDate(business, staff, date);
    if (schedule.isClosed) return false;
    if (startMinutes === null || endMinutes === null) return true;
    if (startMinutes < toMinutes(schedule.start) || endMinutes > toMinutes(schedule.end)) return false;
    return !schedule.breaks.some(item => startMinutes < toMinutes(item.end) && endMinutes > toMinutes(item.start));
  });
}

export function chooseAvailableStaff({ business, businessId, serviceId, date, startMinutes, endMinutes, appointments }) {
  const available = eligibleStaffEntries(business, serviceId, date, startMinutes, endMinutes).filter(entry => {
    const id = staffKey(entry);
    return !Object.values(appointments || {}).some(appointment => intervalOverlapsAppointment(appointment, businessId, date, id, startMinutes, endMinutes, business));
  });
  if (!available.length) return null;
  const dailyCount = entry => Object.values(appointments || {}).filter(appointment => appointment && appointment.businessId === businessId && appointment.date === date && String(appointment.staffId) === staffKey(entry) && !['cancelled', 'rejected', 'no_show'].includes(appointment.status)).length;
  available.sort((left, right) => dailyCount(left) - dailyCount(right) || staffKey(left).localeCompare(staffKey(right)));
  return available[0];
}

// Shared by availability and the transaction-backed booking writer.
export function istanbulNowParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone:'Europe/Istanbul', year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23' }).formatToParts(now);
  const value = type => parts.find(part => part.type === type).value;
  return { date: value('year')+'-'+value('month')+'-'+value('day'), minutes:Number(value('hour'))*60+Number(value('minute')) };
}
export function validBookingDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return false;
  const parsed = new Date(date+'T12:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === date;
}
export function bookingService(business, serviceId) {
  return Object.entries(business.services || {}).find(([key,s]) => s && s.active !== false && [key,s.id,s.serviceId].includes(serviceId))?.[1] || null;
}
export function bookingDuration(service) {
  const duration = Number(service?.durationMinutes ?? service?.duration ?? service?.durationMin ?? 30);
  return Number.isFinite(duration) && duration >= 15 && duration <= 240 ? duration : null;
}
