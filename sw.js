// EZO STİLE v2 Service Worker - WATCHDOG & AUTO MIGRATION (v2.1.8)
const CACHE_NAME = 'ezo-stile-v2.1.8-watchdog-migration';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[SW Evicting Legacy Cache]', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Explicit pass-through for API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Never cache HTML root index to prevent stale module import locks
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
