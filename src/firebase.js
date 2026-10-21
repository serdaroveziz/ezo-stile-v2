import { isInvalidSession } from './operation-errors.js';
import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence
} from 'firebase/auth';

let authPromise = null;
let appPromise = null;

async function loadFirebaseConfig() {
  const response = await fetch('/api/auth/config', { headers: { Accept: 'application/json' } });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.config) {
    throw new Error((data && data.error) || 'Firebase Auth yapılandırılmamış.');
  }
  return data.config;
}

export function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = getFirebaseApp().then(async app => {
      const auth = getAuth(app);
      await setPersistence(auth, browserLocalPersistence);
      return auth;
    }).catch(error => { authPromise = null; throw error; });
  }
  return authPromise;
}

export function getFirebaseApp() {
  if (!appPromise) appPromise = loadFirebaseConfig().then(config => initializeApp(config)).catch(error => { appPromise = null; throw error; });
  return appPromise;
}

export async function waitForFirebaseUser() {
  const auth = await getFirebaseAuth();
  if (auth.currentUser) return auth.currentUser;
  return await new Promise(resolve => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      unsubscribe();
      resolve(user);
    });
  });
}

export async function getIdToken(forceRefresh = false) {
  const user = await waitForFirebaseUser();
  return user ? user.getIdToken(forceRefresh) : null;
}

export async function refreshCurrentIdToken(expectedUid = null) {
  const user = await waitForFirebaseUser();
  if (!user || (expectedUid && user.uid !== expectedUid)) {
    throw Object.assign(new Error('AUTH_SESSION_INVALID'), { code: 'AUTH_SESSION_INVALID' });
  }
  await user.getIdToken(true);
  return user;
}

export async function authenticatedFetch(input, init = {}) {
  let token;
  try { token = await getIdToken(); }
  catch (error) {
    if (isInvalidSession(error)) window.dispatchEvent(new Event('ezo:session-invalid'));
    throw error;
  }
  if (!token) {
    window.dispatchEvent(new Event('ezo:session-invalid'));
    throw Object.assign(new Error('AUTH_SESSION_INVALID'), { code: 'AUTH_SESSION_INVALID' });
  }
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    const data = await response.clone().json().catch(() => ({}));
    if (data.code === 'AUTH_SESSION_INVALID') {
      window.dispatchEvent(new Event('ezo:session-invalid'));
      throw Object.assign(new Error('AUTH_SESSION_INVALID'), { code: 'AUTH_SESSION_INVALID' });
    }
  }
  return response;
}
