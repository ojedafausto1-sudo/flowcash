// FlowCash Service Worker — compatible con OneSignal
// OneSignal importa su propio SW, este lo extiende
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

const CACHE_NAME = 'flowcash-v2';
const CACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// Install — cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Message from app
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({type: 'UPDATE_AVAILABLE'}));
      });
    })
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (!url.origin.includes(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            return caches.match('/') || caches.match('/index.html');
          }
        });
      })
  );
});
