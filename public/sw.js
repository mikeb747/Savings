// Savings PWA Service Worker
const CACHE_NAME = 'savings-pwa-v1';
const STATIC_ASSETS = [
  './',
  './manifest.json',
  './favicon.svg',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).catch((err) => {
      console.warn('Pre-cache error:', err);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Required fetch listener for Chrome PWA installability heuristic
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Do not intercept Google APIs or Firebase Auth network calls
  const url = event.request.url;
  if (
    url.includes('googleapis.com') ||
    url.includes('identitytoolkit') ||
    url.includes('securetoken') ||
    url.includes('firebase')
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful response for static assets
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
