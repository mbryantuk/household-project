const CACHE_NAME = 'totem-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/favicon.png',
  // Vite assets are hashed, so we rely on dynamic caching for them
];

// Install Event - Caching Assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event - Cleaning old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch Event - Stale-While-Revalidate Strategy
// This allows the app to load from cache immediately while updating in the background
self.addEventListener('fetch', (event) => {
  // Skip cross-origin and API requests for now to avoid issues
  if (!event.request.url.startsWith(self.location.origin) || event.request.url.includes('/auth/')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request).then((networkResponse) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        return cachedResponse || fetchedResponse;
      });
    })
  );
});

// Background Sync Placeholder
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-household-data') {
    console.log('Background sync triggered');
    // Implement background sync logic here when needed
  }
});