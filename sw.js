/* ガチ抽選機 - Service Worker
 * オフライン動作のためにアセットをキャッシュします。
 * 更新する際は CACHE_NAME のバージョンを上げてください。
 */
const CACHE_NAME = 'gachi-chusen-v3';
const ASSETS = [
  './',
  './index.html',
  './host.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  // 同一オリジンのみキャッシュ対象
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        // バックグラウンドで更新を試みる (stale-while-revalidate)
        fetch(event.request)
          .then((fresh) => {
            if (fresh && fresh.status === 200 && fresh.type === 'basic') {
              caches.open(CACHE_NAME).then((cache) =>
                cache.put(event.request, fresh.clone())
              );
            }
          })
          .catch(() => { /* オフライン時は無視 */ });
        return cached;
      }
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match('./index.html'));
    })
  );
});
