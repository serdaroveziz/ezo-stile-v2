/* UNELIVO - Auth-scoped authoritative appointment listing */
import { getAdminDatabase } from '../../firebase-admin.js';
import { projectStaffAppointment } from '../../staff-projection.js';
import { hasPermission } from '../../../src/staff-permissions.js';

export async function handleBookingListWithDatabase(req, res, db) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const profile = req.auth && req.auth.profile ? req.auth.profile : {};
  const requestedCustomerScope = Boolean(req.body && req.body.customer);
  const requestedBusinessId = String((req.body && req.body.businessId) || '');
  const staffRoles = ['owner', 'manager', 'barber', 'receptionist'];
  const isSuperAdmin = profile.role === 'super_admin';
  const isTenantStaff = staffRoles.includes(profile.role) && profile.businessId === requestedBusinessId;
  if (!requestedCustomerScope && (!requestedBusinessId || (!isSuperAdmin && !isTenantStaff))) {
    return res.status(403).json({ error: 'Bu salonun randevularını görüntüleme yetkiniz yok.' });
  }

  // Filter on the trusted server so the owner screen does not depend on whether
  // a client-side RTDB index/rule deployment has reached the active project.

  // Re-read tenant membership for every staff request.
  let currentStaff = null;
  if (!requestedCustomerScope && !isSuperAdmin && ['manager', 'barber', 'receptionist'].includes(profile.role)) {
    const staffSnapshot = await db.ref(`businesses/${requestedBusinessId}/staff`).get();
    const staffRecords = staffSnapshot.exists() ? staffSnapshot.val() : {};
    currentStaff = Object.entries(staffRecords).find(([id, member]) => member && member.active !== false && member.role === profile.role && (member.userId === req.auth.uid || member.uid === req.auth.uid || id === `stf_${req.auth.uid}`));
    if (!currentStaff) return res.status(403).json({ error: 'Aktif personel üyeliği bulunamadı.' });
  }
  let snapshot;
  try {
    const queryField = requestedCustomerScope ? 'customerUid' : 'businessId';
    const queryValue = requestedCustomerScope ? req.auth.uid : requestedBusinessId;
    snapshot = await db.ref('appointments').orderByChild(queryField).equalTo(queryValue).get();
  } catch (error) {
    snapshot = await db.ref('appointments').get();
  }

  let records = snapshot.exists() ? Object.entries(snapshot.val()).map(([nodeId, record]) => record ? {
    ...record,
    aptId: nodeId,
    appointmentId: nodeId
  } : null).filter(record => {
    if (!record) return false;
    if (!requestedCustomerScope) return record.businessId === requestedBusinessId;

    return record.customerUid === req.auth.uid;
  }) : [];
  const canViewAllStaffAppointments = profile.role === 'owner' ||
    hasPermission(profile.permissions,'appointments.view') || hasPermission(profile.permissions,'appointments.manage');
  if (!requestedCustomerScope && !isSuperAdmin && profile.role !== 'owner' && !canViewAllStaffAppointments) {
    const staffSnapshot = await db.ref(`businesses/${requestedBusinessId}/staff`).get();
    const staffRecords = staffSnapshot.exists() ? Object.entries(staffSnapshot.val()).map(([id, value]) => ({ id, ...(value || {}) })) : [];
    const ownStaff = staffRecords.find(member => member.userId === req.auth.uid || member.id === `stf_${req.auth.uid}`);
    const ownIds = new Set([req.auth.uid, `stf_${req.auth.uid}`, ownStaff && ownStaff.id, ownStaff && ownStaff.userId].filter(Boolean));
    records = records.filter(record => ownIds.has(record.staffId) || ownIds.has(record.staffUid) || ownIds.has(record.staffUserId));
  }
  if (!requestedCustomerScope && !isSuperAdmin && profile.role !== 'owner') {
    records = records.map(record => projectStaffAppointment(record, profile.permissions || []));
  }
  const canViewCustomerPhone = requestedCustomerScope || isSuperAdmin || profile.role === 'owner' ||
    hasPermission(profile.permissions,'customer.phone.view');
  if (!canViewCustomerPhone) {
    records = records.map(({ customerPhone, customerPhoneSnapshot, ...record }) => record);
  }
  const canViewFinance = requestedCustomerScope || isSuperAdmin || profile.role === 'owner' ||
    hasPermission(profile.permissions,'finance.view') || hasPermission(profile.permissions,'reports.view');
  if (!canViewFinance) {
    records = records.map(({ price, totalPrice, servicePrice, amount, ...record }) => record);
  }
  records.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return res.status(200).json({ appointments: records });
}

export default (req,res)=>handleBookingListWithDatabase(req,res,getAdminDatabase());
