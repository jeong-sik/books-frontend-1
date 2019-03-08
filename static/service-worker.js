const PRECACHE_NAME = 'workbox-precache-v2';

if ('workbox' in self) {
  workbox.setConfig({ debug: true });

  workbox.precaching.precacheAndRoute(self.__precacheManifest || []);

  workbox.routing.registerRoute(new RegExp('.*.js'), new workbox.strategies.NetworkFirst());
  workbox.routing.registerRoute(
    '/static',
    new workbox.strategies.CacheFirst({
      cacheName: 'static-cache',
      plugins: [
        new workbox.cacheableResponse.Plugin({ statuses: [200] }),
        new workbox.rangeRequests.Plugin(),
      ],
    }),
  );

  workbox.routing.registerRoute(
    /.*\.(jpg|png|jpeg|bmp)/,
    new workbox.strategies.CacheFirst({
      cacheName: 'images-cache',
      plugins: [
        new workbox.cacheableResponse.Plugin({ statuses: [200] }),
        new workbox.rangeRequests.Plugin(),
      ],
    }),
  );

  workbox.routing.registerRoute(
    /.*(?:ridibooks)\.com.*$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'mics-images-cache',
      plugins: [
        new workbox.cacheableResponse.Plugin({
          statuses: [0, 200],
        }),
        new workbox.expiration.Plugin({
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
        }),
      ],
    }),
  );
}

self.addEventListener('install', function(event) {
  // The promise that skipWaiting() returns can be safely ignored.
  console.log('[Service Worker] Install!');
  self.skipWaiting();

  // Perform any other actions required for your
  // service worker to install, potentially inside
  // of event.waitUntil();
});

self.addEventListener('activate', e => {
  console.log('[Service Worker] Activate!');
  // caches.keys().then(function(cacheNames) {
  //   return Promise.all(
  //     cacheNames.filter(function(cacheName) {
  //       // Return true if you want to remove this cache,
  //       // but remember that caches are shared across
  //       // the whole origin
  //     }).map(function(cacheName) {
  //       return caches.delete(cacheName);
  //     })
  //   );
  // })
});

self.addEventListener('fetch', function(e) {
  console.log('[Service Worker] Fetch!');
  e.respondWith(
    caches.match(e.request).then(function(r) {
      console.log('[Service Worker] Fetching resource: ' + e.request.url);
      return (
        r ||
        fetch(e.request).then(function(response) {
          return caches.open(PRECACHE_NAME).then(function(cache) {
            console.log('[Service Worker] Caching new resource: ' + e.request.url);
            cache.put(e.request, response.clone());
            return response;
          });
        })
      );
    }),
  );
});
