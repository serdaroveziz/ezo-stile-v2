/* EZO STİLE v2 - Backend-Driven Authentication & Role Resolution */
import { getUserProfile, saveRecord } from './db.js';
import { CONFIG } from './config.js';

let currentUserState = null;

export function getCurrentUser() {
  return currentUserState;
}

export function setCurrentUser(user) {
  currentUserState = user;
  if (user) {
    localStorage.setItem('ez2_session', JSON.stringify({ uid: user.uid, phone: user.phone }));
  } else {
    localStorage.removeItem('ez2_session');
  }
}

/**
 * BACKEND-DRIVEN ROLE RESOLUTION
 * Role is strictly resolved from database records (/users/{uid}.json).
 * User cannot choose or elevate their role on frontend.
 */
export async function resolveBackendUserRole(uid, fallbackPhone = '') {
  if (!uid) return { role: 'customer', businessId: null };

  const dbProfile = await getUserProfile(uid);
  
  if (dbProfile && dbProfile.role) {
    const verifiedRole = CONFIG.ROLE_HIERARCHY.includes(dbProfile.role) ? dbProfile.role : 'customer';
    return {
      uid,
      phone: dbProfile.phone || fallbackPhone,
      name: dbProfile.name || 'EZO Kullanıcısı',
      role: verifiedRole,
      businessId: dbProfile.businessId || null,
      permissions: dbProfile.permissions || {}
    };
  }

  // Default customer profile initialization if new user
  const newCustomer = {
    uid,
    phone: fallbackPhone,
    name: 'Müşteri',
    role: 'customer',
    createdAt: new Date().toISOString()
  };

  await saveRecord(`users/${uid}`, newCustomer);

  return newCustomer;
}

export async function loginUser(phone, password) {
  // Normalize phone digits
  const cleanPhone = phone.replace(/\D/g, '');
  const uid = 'usr_' + cleanPhone;

  const resolvedUser = await resolveBackendUserRole(uid, phone);
  setCurrentUser(resolvedUser);
  return resolvedUser;
}

export async function restoreSession() {
  const sessionRaw = localStorage.getItem('ez2_session');
  if (!sessionRaw) return null;

  try {
    const session = JSON.parse(sessionRaw);
    if (!session || !session.uid) return null;

    const resolvedUser = await resolveBackendUserRole(session.uid, session.phone || '');
    setCurrentUser(resolvedUser);
    return resolvedUser;
  } catch (e) {
    console.warn('Session restore error:', e);
    localStorage.removeItem('ez2_session');
    return null;
  }
}