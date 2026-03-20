// ZentelStore Service Worker v1
const CACHE = 'zentelstore-v1';
const STATIC = [
  '/catalogo/',
  '/catalogo/index.html',
  '/catalogo/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // JSONs del catalogo: network first, fallback a cache
  if (url.pathname.endsWith('.json')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { const c = r.clone(); caches.open(CACHE).then(ca => ca.put(e.request, c)); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }
  // Resto: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(r => {
      const c = r.clone();
      caches.open(CACHE).then(ca => ca.put(e.request, c));
      return r;
    }))
  );
});
