import { hasPermission } from '../src/staff-permissions.js';
export function pickFields(record, keys) {
  return Object.fromEntries(keys.filter(key => record[key] !== undefined).map(key => [key, record[key]]));
}
export function projectStaffBusiness(business, uid, permissions = []) {
  const businessView = pickFields(business, ['name', 'bookingEnabled']);
  const schedule = value => Object.fromEntries(['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].filter(day => value?.[day]).map(day => [day, pickFields(value[day], ['isOpen','start','end'])]));
  businessView.weeklySchedule = schedule(business.weeklySchedule);
  businessView.services = Object.fromEntries(Object.entries(business.services || {}).map(([id, service]) => [id, pickFields(service || {}, ['id','name','price','duration','durationMinutes','active','category'])]));
  const canSchedule = hasPermission(permissions, 'schedule.view') || hasPermission(permissions, 'schedule.manage');
  const staff = Object.entries(business.staff || {}).filter(([, member]) => member && member.active !== false).map(([id, member]) => {
    const own = member.userId === uid;
    const view = { ...pickFields(member, ['name','displayName','photoUrl','active','role']), id };
    view.services = Array.isArray(member.services) ? member.services.filter(v=>typeof v==='string').slice(0,200) : member.services && typeof member.services==='object' ? Object.entries(member.services).filter(([,v])=>v!==false&&v!=null).map(([key])=>key).slice(0,200) : ['all'];
    if (own) view.userId = uid;
    if ((own || canSchedule) && member.weeklySchedule) view.weeklySchedule = schedule(member.weeklySchedule);
    return view;
  });
  return { business: businessView, staff };
}
export function projectStaffAppointment(record, permissions = []) {
  const keys = ['aptId','appointmentId','businessId','customerName','customerNameSnapshot','customerUid','serviceId','serviceName','serviceNameSnapshot','serviceDuration','durationMinutes','staffId','staffUid','staffUserId','staffName','date','time','startTime','endTime','status','createdAt','completedAt','requestedDate','requestedTime','cancelRequestStatus','rescheduleRequestStatus'];
  if (hasPermission(permissions, 'customer.phone.view')) keys.push('customerPhone','customerPhoneSnapshot');
  if (hasPermission(permissions, 'finance.view') || hasPermission(permissions, 'reports.view')) keys.push('price','totalPrice','servicePrice','amount');
  return pickFields(record, keys);
}
