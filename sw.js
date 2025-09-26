const CACHE_NAME = 'jarvis-cache-v2'; // Increased version to trigger update
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest', // Added manifest to cache
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/components/ChatInterface.tsx',
  '/components/ReportView.tsx',
  '/components/icons.tsx',
  '/hooks/useVoiceRecognition.ts',
  '/services/geminiService.ts',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Activate new service worker immediately
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open clients
  );
});

self.addEventListener('fetch', event => {
  // Use a cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Not in cache, fetch from network
        return fetch(event.request);
      }
    )
  );
});
