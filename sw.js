const CACHE_NAME = 'monitor-cidadao-v10';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/src/styles.css',
  '/src/main.js',
  '/src/store.js',
  '/src/ui.js',
  '/src/motion.js',
  '/src/plenary.js',
  '/src/views/plenaryPanel.js',
  '/src/api.js',
  '/src/votes.js',
  '/src/share.js',
  '/src/dossier.js',
  '/src/glossary.js',
  '/src/analysis.js',
  '/src/data/federation.js',
  '/src/views/addPolitician.js',
  '/src/views/alertas.js',
  '/src/views/comparador.js',
  '/src/views/inicio.js',
  '/src/views/perfil.js',
  '/src/views/politicos.js',
  '/src/views/onboarding.js',
  '/src/views/colaEleitoral.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // APIs do Congresso (Câmara e Senado): Network-First com fallback para Cache
  if (url.hostname.includes('camara.leg.br') || url.hostname.includes('senado.leg.br')) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // App Shell estático: Stale-While-Revalidate
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const fetchPromise = fetch(e.request).then((networkRes) => {
        if (networkRes.ok) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
