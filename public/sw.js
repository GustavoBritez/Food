/**
 * Service Worker para Carta App PWA
 * Cachea únicamente iconos y fuentes estáticas del propio dominio.
 * Las páginas (/p/[slug], /, /admin) van siempre por Network-First para garantizar precios al día.
 */

const CACHE_NAME = 'cartaapp-v2';
const PRECACHE_URLS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Solo cacheamos activos estáticos propios (iconos y fuentes de la PWA)
  const isStaticPwaAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/icons/') ||
      url.pathname === '/manifest.webmanifest' ||
      url.pathname.endsWith('.woff2'));

  if (!isStaticPwaAsset) {
    // Todo el resto (cartas /p/[slug], imágenes de Supabase, API, Admin) va directo a red
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      });
    })
  );
});
