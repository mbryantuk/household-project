const CACHE_NAME = 'totem-cache-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('SW: Cleaning old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      return self.clients.claim(); // Become available to all pages immediately
    })
  );
});

// Fetch Event - Network-First for HTML, Stale-While-Revalidate for others
self.addEventListener('fetch', (event) => {
  // Skip cross-origin and API requests
  if (!event.request.url.startsWith(self.location.origin) || 
      event.request.url.includes('/auth/') || 
      event.request.url.includes('/admin/') ||
      event.request.url.includes('/households/')) {
    return;
  }

  // Network-First for the root and index.html to ensure we get update notifications
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchedResponse;
      });
    })
  );
});

// Listen for update message from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
