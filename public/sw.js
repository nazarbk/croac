/* Service worker: la app funciona sin conexión.
 * - Navegación: red primero, caché si no hay conexión.
 * - Recursos estáticos (JS, CSS, fuentes, ilustraciones): caché primero y se actualiza en segundo plano.
 * - La app le pide guardar por adelantado las ilustraciones que usa (mensaje «warm»), para que
 *   la rana se vea entera aunque se abra sin conexión una pantalla que aún no se había visitado.
 * - La caché se limita a MAX_ENTRIES (se van quitando las más antiguas: JS de versiones viejas…).
 * Los datos no pasan por aquí: se guardan en el dispositivo y se sincronizan al volver la conexión. */
const CACHE = 'croac-v5';
const MAX_ENTRIES = 350;

let trimTimer = null;
function trimSoon() {
  clearTimeout(trimTimer);
  trimTimer = setTimeout(async () => {
    const cache = await caches.open(CACHE);
    const keys = await cache.keys();
    const keep = new Set(['/', '/index.html'].map((p) => new URL(p, self.registration.scope).href));
    const extra = keys.length - MAX_ENTRIES;
    for (const req of keys.slice(0, Math.max(0, extra))) if (!keep.has(req.url)) await cache.delete(req);
  }, 3000);
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'warm' || !Array.isArray(data.urls)) return;
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of data.urls.slice(0, 80)) {
        if (await cache.match(url)) continue;
        try {
          const res = await fetch(url);
          if (res.ok) await cache.put(url, res);
        } catch {
          /* sin conexión: ya se intentará otro día */
        }
      }
      trimSoon();
    }),
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './favicon-96.png', './icons/icon-192.png', './icons/apple-touch-icon.png', './art/ui/coin.webp?v=3', './art/ui/xp.webp?v=3'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (!sameOrigin && !isFont) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).then(trimSoon);
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});

/* Al pulsar una notificación, abre o enfoca la app. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./'))),
  );
});
