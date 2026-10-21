/* UNELIVO - Firebase Realtime Database Data Provider & In-Memory TTL Cache Engine */
import { CONFIG } from './config.js';
import { authenticatedFetch, getIdToken } from './firebase.js';

const cacheStore = new Map();
const inflightReads = new Map();
let cacheGeneration = 0;
const CACHE_TTL_MS = 3000; // 3 seconds TTL for list queries to eliminate whole-db read lag

export function invalidateDbCache(pattern = '') {
  cacheGeneration++;
  inflightReads.clear();
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
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) return cached.data;
  }
  if (!bypassCache && inflightReads.has(path)) return inflightReads.get(path);
  const generation = cacheGeneration;
  const readPromise = (async () => {
    try {
      const token = await getIdToken();
      const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
      const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json${authQuery}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (generation === cacheGeneration) cacheStore.set(path, { data, timestamp: Date.now() });
      return data;
    } catch (err) {
      console.warn('DB Fetch Error [' + path + ']:', err);
      return null;
    } finally {
      if (generation === cacheGeneration) inflightReads.delete(path);
    }
  })();
  if (!bypassCache) inflightReads.set(path, readPromise);
  return readPromise;
}
async function fetchQuery(path, orderBy, equalTo) {
  const token = await getIdToken();
  if (!token) return null;
  const params = new URLSearchParams({
    auth: token,
    orderBy: JSON.stringify(orderBy),
    equalTo: JSON.stringify(equalTo)
  });
  const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json?${params}`);
  return res.ok ? res.json() : null;
}

export async function saveRecord(path, data, method = 'PUT') {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('Veri yazmak için oturum açmanız gerekiyor.');
    const res = await fetch(`${CONFIG.FIREBASE_DB_URL}/${path}.json?auth=${encodeURIComponent(token)}`, {
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
  const response = await authenticatedFetch('/api/salon/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(appData)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data || !data.application) {
    throw new Error((data && data.error) || 'Salon başvurusu gönderilemedi.');
  }
  invalidateDbCache('salon_applications');
  return data.application;
}

export async function approveSalonApplication(appId) {
  const response = await authenticatedFetch('/api/salon/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appId })
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) return { success: false, error: (data && data.error) || 'Başvuru onaylanamadı.' };
  invalidateDbCache('salon_applications');
  invalidateDbCache('businesses');
  invalidateDbCache('users');
  return data;
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
  if (!businessId) return [];
  try {
    const response = await authenticatedFetch('/api/booking/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessId })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Randevular alınamadı.');
    return Array.isArray(payload.appointments) ? payload.appointments : [];
  } catch (error) {
    console.warn('Business appointments fetch failed:', error);
    return [];
  }
}

export async function getAppointmentsForCustomer(customerUid, customerPhone = null) {
  if (!customerUid) return [];
  try {
    const response = await authenticatedFetch('/api/booking/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer: true })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'Randevular alınamadı.');
    return Array.isArray(payload.appointments) ? payload.appointments : [];
  } catch (error) {
    console.warn('Customer appointments fetch failed:', error);
    return [];
  }
}


/* --- REALTIME EVENTSOURCE (SSE) SUBSCRIPTION ENGINE --- */
const activeSubscriptions = new Map();

export function subscribeToPath(path, callback) {
  if (typeof window === 'undefined' || !window.EventSource) {
    return () => {};
  }

  const rootKey = path.split('/')[0];
  if (activeSubscriptions.has(path)) {
    try { activeSubscriptions.get(path).close(); } catch(e) {}
  }

  let cancelled = false;
  getIdToken().then(token => {
    if (cancelled) return;
    const authQuery = token ? `?auth=${encodeURIComponent(token)}` : '';
    const es = new EventSource(`${CONFIG.FIREBASE_DB_URL}/${path}.json${authQuery}`);
    let initialEventReceived = false;
    const handleEvent = event => {
      try {
        const payload = JSON.parse(event.data);
        if (payload && payload.data !== undefined) {
          invalidateDbCache(rootKey);
          if (!initialEventReceived) { initialEventReceived = true; return; }
          callback(payload.data, payload.path);
        }
      } catch (err) {
        console.warn('[SSE Parse Error]:', err);
      }
    };
    es.addEventListener('put', handleEvent);
    es.addEventListener('patch', handleEvent);
    activeSubscriptions.set(path, es);
  }).catch(err => console.warn('[SSE Auth Error]:', err));

  return () => {
    cancelled = true;
    const es = activeSubscriptions.get(path);
    try { if (es) es.close(); } catch(e) {}
    activeSubscriptions.delete(path);
  };
}

export function subscribeToQuery(path, orderBy, equalTo, callback) {
  if (typeof window === 'undefined' || !window.EventSource) return () => {};
  const subscriptionKey = `${path}?${orderBy}=${String(equalTo)}`;
  if (activeSubscriptions.has(subscriptionKey)) {
    try { activeSubscriptions.get(subscriptionKey).close(); } catch (e) {}
  }
  let cancelled = false;
  getIdToken().then(token => {
    if (cancelled || !token) return;
    const params = new URLSearchParams({ auth: token, orderBy: JSON.stringify(orderBy), equalTo: JSON.stringify(equalTo) });
    const es = new EventSource(`${CONFIG.FIREBASE_DB_URL}/${path}.json?${params}`);
    let initialEventReceived = false;
    const handleEvent = event => {
      try {
        const payload = JSON.parse(event.data);
        invalidateDbCache(path.split('/')[0]);
        if (!initialEventReceived) { initialEventReceived = true; return; }
        callback(payload && payload.data, payload && payload.path);
      } catch (err) {
        console.warn('[SSE Query Parse Error]:', err);
      }
    };
    es.addEventListener('put', handleEvent);
    es.addEventListener('patch', handleEvent);
    activeSubscriptions.set(subscriptionKey, es);
  }).catch(err => console.warn('[SSE Query Auth Error]:', err));
  return () => {
    cancelled = true;
    const es = activeSubscriptions.get(subscriptionKey);
    try { if (es) es.close(); } catch (e) {}
    activeSubscriptions.delete(subscriptionKey);
  };
}

export function cleanupAllSubscriptions() {
  for (const [path, es] of activeSubscriptions.entries()) {
    try { es.close(); } catch(e) {}
  }
  activeSubscriptions.clear();
}

export async function getStaffContext(businessId) {
  const response = await authenticatedFetch('/api/staff/context', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || 'Personel verisi alınamadı.');
  return payload;
}
// Refresh authorized projections without subscribing to private raw RTDB nodes.
export function subscribeToScopedRefresh(key, load, callback, initial) {
  let cancelled = false, busy = false, previous = JSON.stringify(initial);
  const refresh = async () => {
    if (cancelled || busy || (typeof document !== 'undefined' && document.hidden)) return;
    busy = true;
    try {
      const next = await load();
      const fingerprint = JSON.stringify(next);
      if (!cancelled && fingerprint !== previous) { previous = fingerprint; callback(); }
    } catch (error) { console.warn('Scoped refresh failed:', error); }
    finally { busy = false; }
  };
  const timer = setInterval(refresh, 15000);
  const onVisible = () => { if (!document.hidden) refresh(); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
  const close = () => { cancelled = true; clearInterval(timer); if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible); };
  activeSubscriptions.get(key)?.close();
  activeSubscriptions.set(key, { close });
  return () => { close(); activeSubscriptions.delete(key); };
}
