/* EZO STİLE v2 - Firebase Realtime Database Data Provider & In-Memory TTL Cache Engine */
import { CONFIG } from './config.js';

const cacheStore = new Map();
const CACHE_TTL_MS = 3000; // 3 seconds TTL for list queries to eliminate whole-db read lag

export function invalidateDbCache(pattern = '') {
  if (!pattern) {
    cacheStore.clear();
    return;
  }
  for (const key of cacheStore.keys()) {
    if (key.includes(pattern)) {
      cacheStore.delete(key);
    }
  }
}

export async function fetchRecord(path, bypassCache = false) {
  if (!bypassCache && cacheStore.has(path)) {
    const cached = cacheStore.get(path);
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  try {
    const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json`);
    if (!res.ok) return null;
    const data = await res.json();
    cacheStore.set(path, { data, timestamp: Date.now() });
    return data;
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
    const rootKey = path.split('/')[0];
    invalidateDbCache(rootKey);
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
    bookingEnabled: true,
    discoveryEnabled: true,
    plan: 'FREE',
    ownerUid: app.applicantUid,
    createdAt: new Date().toISOString()
  };

  await saveRecord(`businesses/${businessId}`, bizRecord);

  await saveRecord(`users/${app.applicantUid}`, {
    role: 'owner',
    businessId,
    permissions: { business_manage: true, staff_manage: true, finance_view: true }
  }, 'PATCH');

  await saveRecord(`salon_applications/${appId}`, {
    status: 'approved',
    businessId,
    approvedAt: new Date().toISOString()
  }, 'PATCH');

  return { success: true, businessId };
}

/* --- MULTI-TENANT BOOKING & SALON DATA SERVICES --- */

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
  const data = await fetchRecord('appointments', true);
  if (!data) return [];
  const list = Object.values(data).filter(apt => apt && apt.businessId === businessId);
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}

export async function getAppointmentsForCustomer(customerUid, customerPhone = null) {
  const data = await fetchRecord('appointments', true);
  if (!data) return [];

  let userPhone = customerPhone;
  if (!userPhone && customerUid) {
    const userProf = await fetchRecord(`users/${customerUid}`);
    if (userProf && userProf.phone) userPhone = userProf.phone;
  }

  const cleanDigits = (ph) => String(ph || '').replace(/\D/g, '').slice(-10);
  const targetPhone = userPhone ? cleanDigits(userPhone) : null;
  const targetUidDigits = customerUid ? cleanDigits(customerUid) : null;

  const list = Object.values(data).filter(apt => {
    if (!apt) return false;
    
    const matchesUid = apt.customerUid === customerUid || (targetUidDigits && cleanDigits(apt.customerUid) === targetUidDigits);
    const aptPhone = cleanDigits(apt.customerPhone || apt.customerPhoneSnapshot);
    const matchesPhone = targetPhone && aptPhone && aptPhone.length >= 10 && (aptPhone === targetPhone);

    return matchesUid || matchesPhone;
  });
  return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
