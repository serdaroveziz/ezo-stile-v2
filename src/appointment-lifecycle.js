export function appointmentEndAt(appointment) {
  if (!appointment || !/^\d{4}-\d{2}-\d{2}$/.test(String(appointment.date || ''))) return Number.NaN;
  const start = String(appointment.time || appointment.startTime || '00:00').split(':').map(Number);
  const duration = Number(appointment.serviceDuration || appointment.durationMinutes) || 30;
  return new Date(`${appointment.date}T00:00:00+03:00`).getTime() + ((start[0] * 60 + start[1] + duration) * 60000);
}

export function appointmentHasEnded(appointment, now = Date.now()) {
  const endAt = appointmentEndAt(appointment);
  return Number.isFinite(endAt) && endAt < Number(now);
}

export function effectiveAppointmentStatus(appointment, now = Date.now()) {
  const status = String((appointment && appointment.status) || 'pending');
  if (['completed', 'cancelled', 'rejected', 'no_show'].includes(status)) return status;
  return appointmentHasEnded(appointment, now) ? 'expired' : status;
}

export function isAppointmentUpcoming(appointment, now = Date.now()) {
  return ['pending', 'approved', 'cancel_requested', 'reschedule_requested'].includes(effectiveAppointmentStatus(appointment, now));
}
