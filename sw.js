/* ============================================================
   sw.js — SpendSense service worker
   Caches the app shell (HTML/CSS/JS) so the app opens and your
   already-loaded data works even with no network connection.
   Bump CACHE_NAME whenever shipping new file versions so old
   caches get cleaned up automatically.
   ============================================================ */

const CACHE_NAME = 'spendsense-v1';

const APP_SHELL = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './config.js',
  './storage.js',
  './utils.js',
  './dashboard.js',
  './charts.js',
  './expenseList.js',
  './analytics.js',
  './goals.js',
  './recurring.js',
  './ai.js',
  './app.js',
  './icon-192.png',
  './icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Stale-while-revalidate for same-origin GET requests only.
   Cross-origin requests (Groq API, Google Fonts, Chart.js CDN)
   are left to the network/browser as normal — the app still works
   offline for everything that matters (your data, the UI shell);
   only the AI Coach and first-load fonts/charts need connectivity. */
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req)
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});