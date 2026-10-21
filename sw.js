// UNELIVO Service Worker - Firebase Messaging must initialize here too:
// a closed/background tab has no page module available to receive FCM.
const CACHE_NAME = 'ezo-stile-v2.3.8-native-network';

function safeInternalLink(value) {
  try {
    const target = new URL(String(value || '/?notification=1'), self.location.origin);
    if (target.origin !== self.location.origin || target.pathname !== '/') throw new Error('external_push_link');
    return target.href;
  } catch {
    return new URL('/?notification=1', self.location.origin).href;
  }
}

function showPushNotification(payload = {}) {
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = String(data.title || notification.title || 'UNELIVO').slice(0, 80);
  const body = String(data.body || notification.body || '').slice(0, 180);
  return self.registration.showNotification(title, {
    body,
    icon: '/assets/icons/unelivo-192.png',
    badge: '/assets/icons/unelivo-192.png',
    data: { link: safeInternalLink(data.link || (payload.fcmOptions && payload.fcmOptions.link)) }
  });
}

try {
  importScripts(
    'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js',
    '/api/auth/config?format=service-worker'
  );
  if (self.firebase && self.__EZO_FIREBASE_CONFIG__) {
    if (!self.firebase.apps.length) self.firebase.initializeApp(self.__EZO_FIREBASE_CONFIG__);
    self.firebase.messaging().onBackgroundMessage(payload => showPushNotification(payload));
  }
} catch (error) {
  // The app remains usable without Push if a deployment is missing Web FCM config.
  console.warn('[EZO PUSH] Background messaging is unavailable:', error && error.message);
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[SW Evicting Cache Key]', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Let the browser handle navigation, assets and API requests directly.
// This push-only worker has no offline cache and must not synthesize responses.

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = safeInternalLink(event.notification.data && event.notification.data.link);
  event.waitUntil(clients.matchAll({ type:'window', includeUncontrolled:true }).then(windows => { const existing=windows.find(client => client.url.startsWith(self.location.origin)); if(existing){ existing.navigate(target); return existing.focus(); } return clients.openWindow(target); }));
});
