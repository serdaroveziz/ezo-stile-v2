/* UNELIVO - Firebase Authentication and server-authoritative profiles */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile
} from 'firebase/auth';
import { authenticatedFetch, getFirebaseAuth, refreshCurrentIdToken, waitForFirebaseUser } from './firebase.js';
import { saveRecord } from './db.js';
import { applyDocumentLanguage, detectDefaultLanguage, SUPPORTED_LANGUAGES } from './config.js';

let currentUserState = null;
let sessionGeneration = 1;
const PORTAL_MODE_KEY = 'ezo_portal_mode';
const SESSION_UID_KEY = 'ezo_session_uid';

function resetUidBoundClientState(nextUid = null) {
  const previousUid = sessionStorage.getItem(SESSION_UID_KEY);
  if (previousUid && nextUid && previousUid === nextUid) return;
  for (const key of [PORTAL_MODE_KEY, 'ezo_business_id', 'ezo_selected_business', 'ezo_resolved_role', 'ezo_cached_auth_profile']) {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  }
  for (const unsubscribeKey of ['_unsubscribeBookingRevision', '_unsubscribeOwnerRealtime', '_unsubscribeOwnerStaffRealtime', '_unsubscribeStaffAppointments', '_unsubscribeStaffNotifications', '_unsubscribeStaffSchedule', '_unsubscribeCustomerRealtime', '_unsubscribeCustomerPublicBusinesses', '_unsubscribeCustomerAppointments', '_unsubscribeCustomerNotifications', '_unsubscribeSuperAdminRealtime', '_unsubscribeRealtime']) {
    if (typeof window !== 'undefined' && typeof window[unsubscribeKey] === 'function') {
      try { window[unsubscribeKey](); } catch { /* stale listener cleanup is best effort */ }
    }
    if (typeof window !== 'undefined') window[unsubscribeKey] = null;
  }
  if (typeof window !== 'undefined') {
    window._bookingRevisionBusiness = null;
    window._currentRenderOwnerScreen = null;
    window._currentRenderStaffScreen = null;
    window._currentRenderCustomerScreen = null;
    window._currentRenderSuperAdminScreen = null;
  }
  if (nextUid) sessionStorage.setItem(SESSION_UID_KEY, nextUid);
  else sessionStorage.removeItem(SESSION_UID_KEY);
}

export function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  let national = digits;
  if (digits.startsWith('90') && digits.length === 12) national = digits.slice(2);
  if (national.startsWith('0') && national.length === 11) national = national.slice(1);
  if (!/^5\d{9}$/.test(national)) {
    throw new Error('Geçerli bir Türkiye cep telefonu numarası giriniz.');
  }
  return `+90${national}`;
}

export function normalizePhoneToUid(phone) {
  return `usr_0${normalizePhone(phone).slice(3)}`;
}

function phoneToFirebaseEmail(phone) {
  return `${normalizePhone(phone).slice(1)}@auth.ezostile.app`;
}

async function prepareAuthIdentity(auth, expectedEmail) {
  if (auth.currentUser && String(auth.currentUser.email || '').toLowerCase() !== expectedEmail.toLowerCase()) {
    await signOut(auth);
    setCurrentUser(null);
  }
}

export function getSessionGeneration() {
  return sessionGeneration;
}

export function getCurrentUser() {
  return currentUserState;
}

export function isCustomerPortalRole(role) {
  return !role || role === 'customer';
}

export function isSalonPortalRole(role) {
  return ['owner', 'manager', 'barber', 'receptionist', 'super_admin'].includes(role);
}

export function getPortalMode() {
  const mode = sessionStorage.getItem(PORTAL_MODE_KEY);
  return mode === 'customer' || mode === 'salon' ? mode : null;
}

export function setPortalMode(mode) {
  if (mode !== 'customer' && mode !== 'salon') {
    sessionStorage.removeItem(PORTAL_MODE_KEY);
    return;
  }
  sessionStorage.setItem(PORTAL_MODE_KEY, mode);
}

export function setCurrentUser(user) {
  const nextUid = user && user.uid ? user.uid : null;
  if ((currentUserState && currentUserState.uid) !== nextUid) {
    sessionGeneration++;
    resetUidBoundClientState(nextUid);
  }
  currentUserState = user || null;
  if (user && user.language) localStorage.setItem('ezo_lang', user.language);
}

export function isSessionCurrent(uid, generation) {
  return Boolean(currentUserState && currentUserState.uid === uid && sessionGeneration === generation);
}

export async function updateUserLanguage(lang) {
  if (!SUPPORTED_LANGUAGES.some(item => item.code === lang)) return;
  applyDocumentLanguage(lang);
  if (!currentUserState) {
    localStorage.setItem('ezo_lang', lang);
    return;
  }
  currentUserState.language = lang;
  localStorage.setItem('ezo_lang', lang);
  await saveRecord(`users/${currentUserState.uid}/language`, lang, 'PUT');
}

export async function resolveBackendUserRole(expectedUid = null, expectedGeneration = null) {
  const response = await authenticatedFetch('/api/auth/resolve-role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.success || !data.user) {
    throw new Error((data && data.error) || 'Kullanıcı profili doğrulanamadı.');
  }
  if (expectedUid && data.user.uid !== expectedUid) {
    throw new Error('Oturum ile kullanıcı profili eşleşmiyor. Lütfen tekrar giriş yapınız.');
  }
  if (expectedGeneration !== null && expectedGeneration !== sessionGeneration) return null;
  data.user.language = data.user.language || localStorage.getItem('ezo_lang') || detectDefaultLanguage();
  setCurrentUser(data.user);
  return data.user;
}

export async function resolveAuthoritativeSession(expectedUid = null) {
  const firebaseUser = await refreshCurrentIdToken(expectedUid);
  return resolveBackendUserRole(firebaseUser.uid);
}

export async function loginUser(phone, password) {
  if (!password || password.length < 6) {
    throw new Error('Şifre en az 6 karakter olmalıdır.');
  }

  const normalizedPhone = normalizePhone(phone);
  const auth = await getFirebaseAuth();
  const expectedEmail = phoneToFirebaseEmail(normalizedPhone);
  await prepareAuthIdentity(auth, expectedEmail);
  const loginGeneration = ++sessionGeneration;

  const credential = await signInWithEmailAndPassword(
    auth,
    expectedEmail,
    password
  );

  const firebaseUser = await waitForFirebaseUser();
  if (!firebaseUser || firebaseUser.uid !== credential.user.uid || String(firebaseUser.email || '').toLowerCase() !== expectedEmail.toLowerCase() || loginGeneration !== sessionGeneration) {
    throw new Error('Hesap geçişi tamamlanamadı. Lütfen tekrar deneyiniz.');
  }

  return await resolveBackendUserRole(credential.user.uid);
}
export async function registerCustomer(name, phone, password) {
  const normalizedName = String(name || '').trim();
  if (normalizedName.length < 2) throw new Error('Ad soyad en az 2 karakter olmalıdır.');
  if (!password || password.length < 6) throw new Error('Şifre en az 6 karakter olmalıdır.');
  const normalizedPhone = normalizePhone(phone);
  const auth = await getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, phoneToFirebaseEmail(normalizedPhone), password);
  try {
    await updateProfile(credential.user, { displayName: normalizedName });
    const response = await authenticatedFetch('/api/auth/register-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: normalizedName, phone: normalizedPhone })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.user) {
      throw new Error((data && data.error) || 'Müşteri profili oluşturulamadı.');
    }
    setCurrentUser(data.user);
    return data.user;
  } catch (error) {
    await deleteUser(credential.user).catch(() => {});
    throw error;
  }
}

export async function registerSalonApplicant(ownerName, phone, password, applicationData) {
  const normalizedName = String(ownerName || '').trim();
  if (normalizedName.length < 2) throw new Error('Yetkili adı en az 2 karakter olmalıdır.');
  if (!password || password.length < 6) throw new Error('Şifre en az 6 karakter olmalıdır.');
  const normalizedPhone = normalizePhone(phone);
  const auth = await getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, phoneToFirebaseEmail(normalizedPhone), password);
  try {
    await updateProfile(credential.user, { displayName: normalizedName });
    const profileResponse = await authenticatedFetch('/api/auth/register-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ displayName: normalizedName, phone: normalizedPhone })
    });
    const profileData = await profileResponse.json().catch(() => null);
    if (!profileResponse.ok || !profileData || !profileData.user) {
      throw new Error((profileData && profileData.error) || 'Salon yetkilisi hesabı oluşturulamadı.');
    }
    setCurrentUser(profileData.user);

    const applicationResponse = await authenticatedFetch('/api/salon/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...applicationData,
        ownerName: normalizedName,
        phone: normalizedPhone
      })
    });
    const applicationResult = await applicationResponse.json().catch(() => null);
    if (!applicationResponse.ok || !applicationResult || !applicationResult.application) {
      throw new Error((applicationResult && applicationResult.error) || 'Salon başvurusu gönderilemedi.');
    }
    return applicationResult.application;
  } catch (error) {
    await saveRecord(`users/${credential.user.uid}`, null, 'PUT').catch(() => {});
    await deleteUser(credential.user).catch(() => {});
    setCurrentUser(null);
    throw error;
  }
}

export async function registerStaffWithInvite(token, phone, password) {
  if (!token) throw new Error('Davet kodu zorunludur.');
  if (!password || password.length < 6) throw new Error('Şifre en az 6 karakter olmalıdır.');
  const normalizedPhone = normalizePhone(phone);
  const auth = await getFirebaseAuth();
  let credential;
  let createdNow = false;
  let inviteAccepted = false;
  try {
    credential = await createUserWithEmailAndPassword(auth, phoneToFirebaseEmail(normalizedPhone), password);
    createdNow = true;
  } catch (error) {
    if (error && error.code === 'auth/email-already-in-use') {
      credential = await signInWithEmailAndPassword(auth, phoneToFirebaseEmail(normalizedPhone), password);
    } else {
      throw error;
    }
  }
  try {
    const response = await authenticatedFetch('/api/staff/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, phone: normalizedPhone })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || !data.user) throw new Error((data && data.error) || 'Davet kabul edilemedi.');
    inviteAccepted = true;
    const firebaseUser = await refreshCurrentIdToken(credential.user.uid);
    if (firebaseUser.uid !== credential.user.uid) throw new Error('Davet kabul eden oturum doğrulanamadı.');
    const resolvedUser = await resolveBackendUserRole(credential.user.uid);
    if (!['barber', 'receptionist', 'manager'].includes(resolvedUser.role)) {
      throw new Error('Çalışan rolü doğrulanamadı. Güvenlik nedeniyle patron paneli açılmadı.');
    }
    return resolvedUser;
  } catch (error) {
    if (createdNow && !inviteAccepted) await deleteUser(credential.user).catch(() => {});
    throw error;
  }
}

export async function changeCurrentUserPassword(currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) throw new Error('Yeni şifre en az 6 karakter olmalıdır.');
  const auth = await getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Oturum açmanız gerekiyor.');
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  await updatePassword(user, newPassword);
}

export async function restoreSession() {
  const reqGen = sessionGeneration;
  const firebaseUser = await waitForFirebaseUser();
  if (!firebaseUser || reqGen !== sessionGeneration) return null;
  try {
    return await resolveBackendUserRole(firebaseUser.uid, reqGen);
  } catch (error) {
    // A temporary profile/API failure must not erase a valid Firebase session.
    console.warn('Firebase oturumu geri yüklenemedi:', error);
    throw error;
  }
}

export async function logoutUserSession() {
  sessionGeneration++;
  resetUidBoundClientState(null);
  currentUserState = null;
  try {
    try { const push = await import('./push-notifications.js'); await push.disablePushNotifications(); } catch (error) { console.warn('Push token logout cleanup skipped:', error); }
    const auth = await getFirebaseAuth();
    await signOut(auth);
  } finally {
    sessionStorage.clear();
  }
}
