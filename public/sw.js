/**
 * Service Worker para LaCarta PWA
 * Habilita instalación nativa (Add to Home Screen) y caché de recursos clave.
 */

const CACHE_NAME = 'lacarta-v1';
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Solo interceptamos requests GET dentro del mismo origen o imágenes
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // No cachear API routes o autenticación de Supabase
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Cachear estáticos e iconos
        if (
          networkResponse.status === 200 &&
          (url.pathname.startsWith('/icons/') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.woff2'))
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Si no hay red y teníamos en caché la página inicial
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return null;
      });
    })
  );
});
