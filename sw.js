// EZO STİLE v2 Service Worker - MASTER VERSION ALIGNMENT (v2.2.0)
const CACHE_NAME = 'ezo-stile-v2.2.0-master-fix';

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

self.addEventListener('fetch', (event) => {
  // Pass-through API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }
  // Always fetch fresh HTML & JS module entries
  if (event.request.mode === 'navigate' || event.request.url.endsWith('index.html') || event.request.url.includes('?v=')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
