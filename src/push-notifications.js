import { getMessaging, getToken, isSupported, onMessage, deleteToken } from 'firebase/messaging';
import { getFirebaseApp, authenticatedFetch } from './firebase.js';

let foregroundUnsubscribe = null;
const seenForeground = new Set();

async function getPushRuntimeConfig() {
  const response = await fetch('/api/auth/config').catch(() => null);
  const data = response && await response.json().catch(() => null);
  if (!response || !response.ok || !data || !data.config || !data.config.messagingSenderId || !data.vapidKey) {
    console.warn('[EZO PUSH] Web Push is disabled because its optional FCM configuration is incomplete.');
    return null;
  }
  return data;
}
export async function getPushPermissionState() {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported().catch(() => false))) return 'unsupported';
  return Notification.permission;
}
export async function enablePushNotifications() {
  const state = await getPushPermissionState();
  if (state === 'unsupported') return { state };
  const permission = state === 'granted' ? state : await Notification.requestPermission();
  if (permission !== 'granted') return { state:permission };
  const registration = await navigator.serviceWorker.ready;
  const configData = await getPushRuntimeConfig();
  if (!configData) return { state:'unsupported', reason:'missing_fcm_config' };
  const messaging = getMessaging(await getFirebaseApp());
  const token = await getToken(messaging, { vapidKey:configData.vapidKey, serviceWorkerRegistration:registration });
  if (!token) throw new Error('Push token alınamadı.');
  const response = await authenticatedFetch('/api/notifications/push-token', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ token, platform:'web', deviceHint:navigator.platform || 'browser' }) });
  if (!response.ok) throw new Error('Push token kaydedilemedi.');
  return { state:'granted', token };
}
export async function disablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || Notification.permission !== 'granted') return { state:'disabled' };
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) return {state:'disabled'};
  if (!(await isSupported().catch(() => false))) return { state:'unsupported' };
  const configData = await getPushRuntimeConfig();
  if (!configData) return { state:'unsupported', reason:'missing_fcm_config' };
  const messaging = getMessaging(await getFirebaseApp());
  const token = await getToken(messaging,{ vapidKey:configData.vapidKey, serviceWorkerRegistration:registration }).catch(() => null);
  if (token) await authenticatedFetch('/api/notifications/push-token',{ method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ token }) }).catch(() => null);
  await deleteToken(messaging).catch(() => false);
  return { state:'disabled' };
}
export async function listenForForegroundPush(onPayload) {
  if (!(await isSupported().catch(() => false))) return () => {};
  if (!(await getPushRuntimeConfig())) return () => {};
  if (foregroundUnsubscribe) foregroundUnsubscribe();
  foregroundUnsubscribe = onMessage(getMessaging(await getFirebaseApp()), payload => { const key=payload.messageId || JSON.stringify(payload.data || {}); if(seenForeground.has(key)) return; seenForeground.add(key); if(seenForeground.size>100) seenForeground.clear(); onPayload && onPayload(payload); });
  return foregroundUnsubscribe;
}
