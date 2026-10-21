import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getMessaging } from 'firebase-admin/messaging';

const DEFAULT_DATABASE_URL = 'https://ezostile-barber-default-rtdb.europe-west1.firebasedatabase.app';

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      return cert(JSON.parse(raw));
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON geçerli JSON değil.');
    }
  }
  return applicationDefault();
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    const projectId = process.env.FIREBASE_PROJECT_ID || '';
    if (!/^(localhost|127\.0\.0\.1):\d+$/.test(host) || !projectId.startsWith('demo-')) throw new Error('Emulator requires loopback host and demo project.');
    return initializeApp({ projectId, databaseURL: 'http://' + host + '?ns=' + projectId });
  }
  return initializeApp({
    credential: loadCredential(),
    databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID || 'ezostile-barber'
  });
}

export function getAdminAuth() {
  return getAuth(getAdminApp());
}

export function getAdminDatabase() {
  return getDatabase(getAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getAdminApp());
}

export async function firebaseFetch(url, options) {
  const app = getAdminApp();
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    const target = new URL(url);
    target.protocol = 'http:';
    target.host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
    target.searchParams.delete('auth');
    target.searchParams.delete('access_token');
    target.searchParams.set('ns', app.options.projectId);
    return fetch(target, { ...options, headers: { ...options?.headers, Authorization: 'Bearer owner' } });
  }
  const credential = app.options.credential;
  if (!credential || typeof credential.getAccessToken !== 'function') {
    throw new Error('Firebase Admin kimlik bilgisi kullanılamıyor.');
  }
  const accessToken = await credential.getAccessToken();
  const target = new URL(url);
  target.searchParams.set('access_token', accessToken.access_token);
  return fetch(target, options);
}

export async function requireAuth(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const match = typeof header === 'string' ? header.match(/^Bearer\s+(.+)$/i) : null;
  if (!match) {
    const error = new Error('Oturum doğrulaması gerekli.');
    error.statusCode = 401; error.code = 'AUTH_SESSION_INVALID';
    throw error;
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(match[1], true);
  } catch (cause) {
    const invalidCodes = ['auth/id-token-expired', 'auth/id-token-revoked', 'auth/invalid-id-token', 'auth/argument-error', 'auth/user-disabled', 'auth/user-not-found'];
    if (!invalidCodes.includes(cause?.code)) {
      throw Object.assign(new Error('AUTH_SERVICE_UNAVAILABLE'), { statusCode: 503 });
    }
    const error = new Error('Oturum geçersiz veya süresi dolmuş.');
    error.statusCode = 401; error.code = 'AUTH_SESSION_INVALID';
    throw error;
  }

  let snapshot;
  try {
    snapshot = await getAdminDatabase().ref(`users/${decoded.uid}`).get();
  } catch {
    const error = new Error('Firebase Admin yapılandırması kullanılamıyor.');
    error.statusCode = 503;
    throw error;
  }
  const profile = snapshot.exists() ? snapshot.val() : null;
  if (profile && (profile.disabled === true || profile.status === 'disabled' || profile.status === 'deleted')) {
    const error = new Error('Hesap devre dışı.'); error.statusCode = 403; throw error;
  }
  const resolution = await resolveTenantMembership(decoded.uid, profile);
  return { token: match[1], uid: decoded.uid, decoded, profile: resolution.profile, resolution };
}

export async function verifyTenantMembership(uid, profile) {
  return (await resolveTenantMembership(uid, profile)).profile;
}

export async function resolveTenantMembership(uid, profile) {
  if (!profile || typeof profile !== 'object') return { profile:null, reason:'PROFILE_NOT_FOUND', sourceRole:null, sourceBusinessId:null, businessExists:false, ownershipVerified:false, staffVerified:false, staffRole:null };
  const role = String(profile.role || 'customer');
  if (role === 'super_admin') return resolveVerifiedTenantDecision(uid, profile, null);
  if (role === 'customer' || !['owner','manager','barber','receptionist'].includes(role)) {
    return resolveVerifiedTenantDecision(uid, profile, null);
  }
  const businessId = String(profile.businessId || '');
  if (!businessId) return resolveVerifiedTenantDecision(uid, profile, null);
  const businessSnapshot = await getAdminDatabase().ref(`businesses/${businessId}`).get();
  const business = businessSnapshot.exists() ? businessSnapshot.val() : null;
  return resolveVerifiedTenantDecision(uid, profile, business);
}

export function resolveVerifiedTenantProfile(uid, profile, business) {
  return resolveVerifiedTenantDecision(uid, profile, business).profile;
}

export function resolveVerifiedTenantDecision(uid, profile, business) {
  const role = String((profile && profile.role) || 'customer');
  const sourceBusinessId = String((profile && profile.businessId) || '');
  const ownerMatch = Boolean(business && business.ownerUid === uid);
  const linkedStaff = business && Object.values(business.staff || {}).find(member => member && member.active !== false && member.userId === uid && member.role === role);
  const base = { sourceRole:role, sourceBusinessId:sourceBusinessId || null, businessExists:Boolean(business), ownershipVerified:ownerMatch, staffVerified:Boolean(linkedStaff), staffRole:linkedStaff ? linkedStaff.role : null };
  if (role === 'super_admin') return { ...base, profile:{ ...profile, uid, role:'super_admin', businessId:null }, reason:'SUPER_ADMIN_MATCH' };
  const safeCustomer = { ...(profile || {}), uid, role:'customer', businessId:null, permissions:[] };
  if (role === 'customer') return { ...base, profile:safeCustomer, reason:'CUSTOMER_PROFILE' };
  if (!['owner','manager','barber','receptionist'].includes(role)) return { ...base, profile:safeCustomer, reason:'UNKNOWN_ROLE_FALLBACK_CUSTOMER' };
  if (!sourceBusinessId || !business) return { ...base, profile:safeCustomer, reason:role==='owner'?'INVALID_OWNER_PROFILE_FALLBACK_CUSTOMER':'INVALID_STAFF_PROFILE_FALLBACK_CUSTOMER' };
  if (role === 'owner') {
    return ownerMatch
      ? { ...base, profile:{ ...profile, uid, role:'owner', businessId:sourceBusinessId }, reason:'VERIFIED_OWNER_UID' }
      : { ...base, profile:safeCustomer, reason:'INVALID_OWNER_PROFILE_FALLBACK_CUSTOMER' };
  }
  return linkedStaff
    ? { ...base, profile:{ ...profile, uid, role, businessId:sourceBusinessId, permissions:linkedStaff.permissions ?? profile.permissions ?? [] }, reason:'VERIFIED_ACTIVE_STAFF' }
    : { ...base, profile:safeCustomer, reason:'INVALID_STAFF_PROFILE_FALLBACK_CUSTOMER' };
}

export function requireRole(authContext, allowedRoles) {
  const role = authContext.profile && authContext.profile.role;
  if (!allowedRoles.includes(role)) {
    const error = new Error('Bu işlem için yetkiniz yok.');
    error.statusCode = 403;
    throw error;
  }
}

export async function firebaseFetchChecked(url, options) {
  const response = await firebaseFetch(url, options);
  if (!response.ok) throw new Error('Firebase operation failed: ' + response.status);
  return response;
}

// Keep the cache alive through transactions that abort when records are absent.
export async function transactionWithCurrentValue(ref, update) {
  const listener = ref.on('value', () => {});
  try { await ref.once('value'); return await ref.transaction(update); }
  finally { ref.off('value', listener); }
}
