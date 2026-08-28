/* EZO STİLE v2 - Backend-Driven Authentication, Session Persistence & Language Engine */
import { getUserProfile, saveRecord } from './db.js';
import { CONFIG, detectDefaultLanguage } from './config.js';

let currentUserState = null;

export function getCurrentUser() {
  if (!currentUserState) {
    const raw = localStorage.getItem('ezo_user_data');
    if (raw) {
      try { currentUserState = JSON.parse(raw); } catch (e) {}
    }
  }
  return currentUserState;
}

export function setCurrentUser(user) {
  currentUserState = user;
  if (user) {
    localStorage.setItem('ez2_session', JSON.stringify({
      uid: user.uid,
      phone: user.phone,
      role: user.role,
      expiresAt: Date.now() + 30 * 86400000
    }));
    localStorage.setItem('ezo_user_data', JSON.stringify(user));
    if (user.language) {
      localStorage.setItem('ezo_lang', user.language);
    }
  } else {
    localStorage.removeItem('ez2_session');
    localStorage.removeItem('ezo_user_data');
  }
}

export async function updateUserLanguage(lang) {
  if (currentUserState) {
    currentUserState.language = lang;
    localStorage.setItem('ezo_lang', lang);
    localStorage.setItem('ezo_user_data', JSON.stringify(currentUserState));
    await saveRecord(`users/${currentUserState.uid}/language`, lang, 'PUT');
  } else {
    localStorage.setItem('ezo_lang', lang);
  }
}

export async function resolveBackendUserRole(uid, fallbackPhone = '', password = '') {
  if (!uid) return { role: 'customer', businessId: null, language: detectDefaultLanguage() };

  // Call serverless backend role resolution endpoint first
  try {
    const res = await fetch('/api/auth/resolve-role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, phone: fallbackPhone, password })
    });
    const resData = await res.json().catch(() => null);

    if (res.ok && resData && resData.success && resData.user) {
      const u = resData.user;
      u.language = u.language || localStorage.getItem('ezo_lang') || detectDefaultLanguage();
      u.displayName = u.displayName || u.name || 'EZO Kullanıcısı';
      return u;
    }
  } catch (e) {
    console.warn('Backend role resolution fetch error, using DB fallback:', e);
  }

  // DB Fallback
  const dbProfile = await getUserProfile(uid);
  const activeLang = (dbProfile && dbProfile.language) ? dbProfile.language : (localStorage.getItem('ezo_lang') || detectDefaultLanguage());
  
  if (dbProfile && dbProfile.role) {
    const verifiedRole = CONFIG.ROLE_HIERARCHY.includes(dbProfile.role) ? dbProfile.role : 'customer';
    return {
      uid,
      phone: dbProfile.phone || fallbackPhone,
      name: dbProfile.displayName || dbProfile.name || 'EZO Kullanıcısı',
      displayName: dbProfile.displayName || dbProfile.name || 'EZO Kullanıcısı',
      role: verifiedRole,
      businessId: dbProfile.businessId || null,
      permissions: dbProfile.permissions || {},
      aiCredits: dbProfile.aiCredits || { economy: 3, premium: 1 },
      language: activeLang,
      photoUrl: dbProfile.photoUrl || null
    };
  }

  const newCustomer = {
    uid,
    phone: fallbackPhone,
    name: 'Müşteri',
    displayName: 'Müşteri',
    role: 'customer',
    aiCredits: { economy: 3, premium: 1 },
    language: activeLang,
    createdAt: new Date().toISOString()
  };

  await saveRecord(`users/${uid}`, newCustomer);
  return newCustomer;
}

export async function loginUser(phone, password) {
  const cleanPhone = phone.replace(/\D/g, '');
  let uid = 'usr_' + cleanPhone;

  // Dedicated Phone Resolvers for Super Admin (Kuvvat) & Owner
  if (cleanPhone.includes('5538762588') || cleanPhone === '05538762588' || cleanPhone === '05550000000' || cleanPhone === '05320000000') {
    uid = 'usr_05538762588';
  } else if (cleanPhone === '05550000002') {
    uid = 'usr_05550000002';
  }

  const resolvedUser = await resolveBackendUserRole(uid, phone, password);
  setCurrentUser(resolvedUser);
  return resolvedUser;
}

export async function registerCustomer(name, phone, password) {
  const cleanPhone = phone.replace(/\D/g, '');
  const uid = 'usr_' + cleanPhone;

  const newCustomerRecord = {
    uid,
    phone,
    name,
    displayName: name,
    role: 'customer',
    password: password || '123456',
    aiCredits: { economy: 3, premium: 1 },
    language: localStorage.getItem('ezo_lang') || detectDefaultLanguage(),
    createdAt: new Date().toISOString()
  };

  await saveRecord(`users/${uid}`, newCustomerRecord);
  setCurrentUser(newCustomerRecord);
  return newCustomerRecord;
}

export async function restoreSession() {
  const sessionRaw = localStorage.getItem('ez2_session');
  if (!sessionRaw) return null;

  try {
    const session = JSON.parse(sessionRaw);
    if (!session || !session.uid) return null;

    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem('ez2_session');
      localStorage.removeItem('ezo_user_data');
      return null;
    }

    const resolvedUser = await resolveBackendUserRole(session.uid, session.phone || '', '', true);
    setCurrentUser(resolvedUser);
    return resolvedUser;
  } catch (e) {
    console.warn('Session restore error:', e);
    return getCurrentUser();
  }
}

export function logoutUserSession() {
  currentUserState = null;
  localStorage.removeItem('ez2_session');
  localStorage.removeItem('ezo_user_data');
  sessionStorage.clear();
}