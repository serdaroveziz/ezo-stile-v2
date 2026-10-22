import crypto from 'crypto';
import { getAdminDatabase, getAdminMessaging } from './firebase-admin.js';

const INVALID_CODES = new Set(['messaging/invalid-registration-token','messaging/registration-token-not-registered']);
const safeKey = value => crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 40);

export function sanitizePushPayload(payload = {}) {
  const data = {};
  for (const key of ['type','appointmentId','businessId','targetTab','targetSection']) {
    if (payload[key] != null) data[key] = String(payload[key]).slice(0, 160);
  }
  return { title:String(payload.title || 'UNELIVO').slice(0, 80), body:String(payload.message || payload.body || '').slice(0, 180), data };
}

export function buildPushLink(payload = {}) {
  const safe = sanitizePushPayload(payload);
  const params = new URLSearchParams({ notification:'1' });
  for (const key of ['appointmentId','businessId','targetTab','targetSection']) {
    if (safe.data[key]) params.set(key, safe.data[key]);
  }
  return `/?${params.toString()}`;
}

export async function sendPushToUser(uid, payload, { database=getAdminDatabase(), messaging=getAdminMessaging() } = {}) {
  if (!uid || !payload || !payload.eventId) return { sent:0, skipped:'missing_target_or_event' };
  const [prefsSnap,tokensSnap] = await Promise.all([database.ref(`users/${uid}/notificationPreferences`).get(),database.ref(`users/${uid}/pushTokens`).get()]);
  const prefs = prefsSnap.val() || {};
  if (prefs.inApp === false || prefs.push === false) return { sent:0, skipped:'preference_off' };
  const tokens = Object.entries(tokensSnap.val() || {}).filter(([,record]) => record && record.enabled !== false && record.token);
  if (!tokens.length) return { sent:0, skipped:'no_tokens' };
  const eventRef = database.ref(`push_delivery_events/${uid}/${safeKey(payload.eventId)}`);
  const claim = await eventRef.transaction(current => current ? undefined : { eventId:String(payload.eventId).slice(0,240), status:'sending', createdAt:new Date().toISOString() });
  if (!claim.committed) return { sent:0, skipped:'duplicate' };
  const safe = sanitizePushPayload(payload);
  try {
    // Data-only FCM lets the service worker render exactly one background
    // notification. Foreground rendering stays in the in-app notification center.
    const link = buildPushLink(payload);
    const response = await messaging.sendEachForMulticast({ tokens:tokens.map(([,record]) => record.token), data:{ ...safe.data, title:safe.title, body:safe.body, link }, webpush:{ fcmOptions:{ link } } });
    await Promise.all(response.responses.map((item,index) => item.success ? null : (INVALID_CODES.has(item.error && item.error.code) ? database.ref(`users/${uid}/pushTokens/${tokens[index][0]}`).remove() : null)));
    await eventRef.update({ status:'sent', successCount:response.successCount, failureCount:response.failureCount, completedAt:new Date().toISOString() });
    return { sent:response.successCount, failed:response.failureCount };
  } catch (error) {
    await eventRef.update({ status:'failed', errorCode:String(error.code || 'send_failed').slice(0,80), completedAt:new Date().toISOString() });
    return { sent:0, failed:tokens.length, error:error.code || 'send_failed' };
  }
}

export function reminderEligibility(appointment, nowMs=Date.now(), minutes=180) {
  if (!appointment || !['approved','confirmed','active'].includes(String(appointment.status))) return false;
  const timestamp = Date.parse(`${appointment.date}T${appointment.time}:00+03:00`);
  if (!Number.isFinite(timestamp)) return false;
  const diff = timestamp - nowMs;
  const target = minutes * 60000;
  return diff > 0 && diff <= target && diff > target - 15 * 60000;
}
