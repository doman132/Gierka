/* Speedway Empire 3D — service worker: gra działa offline po pierwszym uruchomieniu.
   Kod i strony: najpierw sieć (świeże wersje), modele i tekstury: najpierw pamięć podręczna. */
const CACHE = 'se3d-v5';
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const heavy = /\/(models|lib)\//.test(url.pathname) && !/\.json$/.test(url.pathname); // anims.json i dane — zawsze świeże
  if (heavy) {
    e.respondWith(caches.open(CACHE).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }))));
  } else {
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req)));
  }
});
