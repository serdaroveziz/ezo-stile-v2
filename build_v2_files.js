const fs = require('fs');

function write(path, content) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('✓ Created:', path);
}

// 1. src/config.js
write('src/config.js', /* EZO STİLE v2 - System Configuration & Constants */

export const CONFIG = {
  APP_NAME: 'EZO STİLE v2',
  APP_VERSION: '2.0.0',
  FIREBASE_DB_URL: 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app',
  ROLE_HIERARCHY: ['super_admin', 'owner', 'manager', 'barber', 'receptionist', 'customer'],
  ROLE_LABELS: {
    super_admin: '⚡ Platform Süper Admin',
    owner: '👑 Salon Sahibi / Owner',
    manager: '🧑‍💼 Yönetici / Manager',
    barber: '💈 Berber Uzmanı / Barber',
    receptionist: '🛎️ Resepsiyonist',
    customer: '👤 Müşteri'
  },
  DEFAULT_BUSINESS_ID: 'biz_merkez_salon'
};

export function getApiBaseUrl() {
  if (typeof window !== 'undefined' && window.location.hostname.includes('github.io')) {
    return 'https://ezo-stile-app.vercel.app';
  }
  return '';
}
);

// 2. src/permissions.js
write('src/permissions.js', /* EZO STİLE v2 - Security & Permission Engine */
import { CONFIG } from './config.js';

export const PERMISSIONS = {
  SUPER_ADMIN_MANAGE: 'super_admin.manage',
  BUSINESS_MANAGE: 'business.manage',
  STAFF_MANAGE: 'staff.manage',
  SCHEDULE_MANAGE: 'schedule.manage',
  SERVICES_MANAGE: 'services.manage',
  FINANCE_VIEW: 'finance.view',
  APPOINTMENTS_MANAGE: 'appointments.manage',
  APPOINTMENTS_VIEW: 'appointments.view',
  CUSTOMER_BOOK: 'customer.book'
};

export function getRoleRank(role) {
  const idx = CONFIG.ROLE_HIERARCHY.indexOf(role);
  return idx !== -1 ? idx : 99;
}

export function hasPermission(user, requiredPerm) {
  if (!user || !user.role) return false;
  const role = user.role;

  if (role === 'super_admin') return true;

  if (role === 'owner') {
    return requiredPerm !== PERMISSIONS.SUPER_ADMIN_MANAGE;
  }

  if (role === 'manager') {
    const userPerms = user.permissions || {};
    return Boolean(userPerms[requiredPerm]);
  }

  if (role === 'barber' || role === 'receptionist') {
    return requiredPerm === PERMISSIONS.APPOINTMENTS_VIEW ||
           requiredPerm === PERMISSIONS.APPOINTMENTS_MANAGE ||
           requiredPerm === PERMISSIONS.SCHEDULE_MANAGE;
  }

  if (role === 'customer') {
    return requiredPerm === PERMISSIONS.CUSTOMER_BOOK;
  }

  return false;
}
);

// 3. src/db.js
write('src/db.js', /* EZO STİLE v2 - Firebase Realtime Database Data Provider */
import { CONFIG } from './config.js';

export async function fetchRecord(path) {
  try {
    const res = await fetch(\\/\.json\);
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn('DB Fetch Error [' + path + ']:', err);
    return null;
  }
}

export async function saveRecord(path, data, method = 'PUT') {
  try {
    const res = await fetch(\\/\.json\, {
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
  return await fetchRecord(\users/\\);
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
  const ok = await saveRecord(\salon_applications/\\, record);
  return ok ? record : null;
}

export async function approveSalonApplication(appId) {
  const app = await fetchRecord(\salon_applications/\\);
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

  await saveRecord(\usinesses/\\, bizRecord);

  await saveRecord(\users/\\, {
    role: 'owner',
    businessId,
    permissions: { 'business.manage': true, 'staff.manage': true, 'finance.view': true }
  }, 'PATCH');

  await saveRecord(\salon_applications/\\, {
    status: 'approved',
    businessId,
    approvedAt: new Date().toISOString()
  }, 'PATCH');

  return { success: true, businessId };
}
);

console.log('build_v2_files.js written successfully!');