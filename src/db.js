/* EZO STİLE v2 - Firebase Realtime Database Data Provider */
import { CONFIG } from './config.js';

export async function fetchRecord(path) {
  try {
    const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('DB Fetch Error [' + path + ']:', err);
    return null;
  }
}

export async function saveRecord(path, data, method = 'PUT') {
  try {
    const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return res.ok;
  } catch (err) {
    console.warn('DB Save Error [' + path + ']:', err);
    return false;
  }
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  return await fetchRecord(`users/${uid}`);
}

export async function getSalonApplications() {
  const data = await fetchRecord('salon_applications');
  if (!data) return [];
  return Object.values(data);
}

export async function submitSalonApplication(appData) {
  const appId = 'app_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const record = {
    appId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    ...appData
  };
  const ok = await saveRecord(`salon_applications/${appId}`, record);
  return ok ? record : null;
}

export async function approveSalonApplication(appId) {
  const app = await fetchRecord(`salon_applications/${appId}`);
  if (!app) return { success: false, error: 'Başvuru bulunamadı.' };

  const businessId = 'biz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  
  const bizRecord = {
    businessId,
    name: app.salonName,
    phone: app.phone,
    city: app.city,
    district: app.district,
    address: app.address,
    instagram: app.instagram,
    photoUrl: app.photoUrl,
    serviceTypes: app.serviceTypes || ['Erkek Saç Kesimi', 'Sakal Tıraşı'],
    bookingEnabled: false,
    ownerUid: app.applicantUid,
    createdAt: new Date().toISOString()
  };

  await saveRecord(`businesses/${businessId}`, bizRecord);

  await saveRecord(`users/${app.applicantUid}`, {
    role: 'owner',
    businessId,
    permissions: { 'business.manage': true, 'staff.manage': true, 'finance.view': true }
  }, 'PATCH');

  await saveRecord(`salon_applications/${appId}`, {
    status: 'approved',
    businessId,
    approvedAt: new Date().toISOString()
  }, 'PATCH');

  return { success: true, businessId };
}

/* --- PHASE 2: MULTI-TENANT BOOKING & SALON DATA SERVICES --- */

export async function getBusinessRecord(businessId) {
  if (!businessId) return null;
  return await fetchRecord(`businesses/${businessId}`);
}

export async function getServices(businessId) {
  const data = await fetchRecord(`businesses/${businessId}/services`);
  if (!data) return [];
  return Object.values(data);
}

export async function saveService(businessId, serviceData) {
  const serviceId = serviceData.id || 'svc_' + Date.now();
  const record = { id: serviceId, active: true, ...serviceData };
  const ok = await saveRecord(`businesses/${businessId}/services/${serviceId}`, record);
  return ok ? record : null;
}

export async function getStaffList(businessId) {
  const data = await fetchRecord(`businesses/${businessId}/staff`);
  if (!data) return [];
  return Object.values(data);
}

export async function saveStaff(businessId, staffData) {
  const staffId = staffData.id || 'stf_' + Date.now();
  const record = { id: staffId, active: true, ...staffData };
  const ok = await saveRecord(`businesses/${businessId}/staff/${staffId}`, record);
  return ok ? record : null;
}

export async function getAppointmentsForBusiness(businessId) {
  const data = await fetchRecord('appointments');
  if (!data) return [];
  return Object.values(data).filter(apt => apt && apt.businessId === businessId);
}

export async function getAppointmentsForCustomer(customerUid) {
  const data = await fetchRecord('appointments');
  if (!data) return [];
  return Object.values(data).filter(apt => apt && apt.customerUid === customerUid);
}