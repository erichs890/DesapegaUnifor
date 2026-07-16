/**
 * Service Worker — Desapego Universitário (requisito PWA)
 *
 * Estratégias:
 *  - App shell (navegações): network-first com fallback ao cache
 *    → o app abre offline depois da primeira visita.
 *  - Assets estáticos (JS/CSS/fontes/ícones): stale-while-revalidate
 *    → resposta instantânea do cache + atualização em background.
 *  - GET /api: network-first com fallback ao cache
 *    → dados já carregados continuam visíveis offline (bônus do edital).
 */
const VERSION = 'v2';
const SHELL_CACHE = `shell-${VERSION}`;
const ASSET_CACHE = `assets-${VERSION}`;
const API_CACHE = `api-${VERSION}`;

const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, ASSET_CACHE, API_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1) Navegações (HTML) — network-first, fallback: shell em cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/', { cacheName: SHELL_CACHE }))
    );
    return;
  }

  // 2) API — network-first, fallback: última resposta em cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(request, { cacheName: API_CACHE }).then(
            (cached) =>
              cached ??
              new Response(JSON.stringify({ error: 'Você está offline e este dado ainda não foi carregado.' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              })
          )
        )
    );
    return;
  }

  // 3) Assets estáticos, /uploads e imagens externas — stale-while-revalidate
  if (url.origin === self.location.origin || url.hostname === 'images.unsplash.com' || url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached ?? network;
      })
    );
  }
});
