// app/api/sw/route.ts
export const GET = async () => {
  const sw = `
  const APP_CACHE = 'gpx-pwa-app-v1';
  const TILE_CACHE = 'gpx-pwa-tiles-v1';
  const OFFLINE_URL = '/offline.html';

  self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
      try {
        const cache = await caches.open(APP_CACHE);
        await cache.addAll([OFFLINE_URL]);
      } catch {}
      self.skipWaiting();
    })());
  });

  self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => ![APP_CACHE, TILE_CACHE].includes(k)).map(k => caches.delete(k)));
      await self.clients.claim();
    })());
  });

  const isTile = (url) => {
    const u = new URL(url);
    return /(^|\.)tile\.openstreetmap\.org$/.test(u.hostname);
  };

  self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // don't cache Next internals and API
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api')) return;

    // Navigation requests: network first with offline fallback
    if (req.mode === 'navigate') {
      event.respondWith(
        fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || new Response('Offline', { status: 503 }))
      );
      return;
    }

    // Tile requests: stale-while-revalidate into TILE_CACHE
    if (isTile(req.url)) {
      event.respondWith((async () => {
        const cache = await caches.open(TILE_CACHE);
        const cached = await cache.match(req, { ignoreSearch: true });
        const fetchAndPut = fetch(req).then((res) => {
          if (res && (res.type === 'basic' || res.type === 'cors') && res.ok) cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => null);
        return cached || (await fetchAndPut) || new Response('Offline', { status: 503 });
      })());
      return;
    }

    // Other GET: network with cache fallback, then populate APP_CACHE
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net && net.ok && (net.type === 'basic' || net.type === 'cors')) {
          caches.open(APP_CACHE).then(c => c.put(req, net.clone())).catch(() => {});
        }
        return net;
      } catch {
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        return new Response('Offline', { status: 503 });
      }
    })());
  });
  `;
  return new Response(sw, {
    headers: {
      'content-type': 'application/javascript; charset=utf-8',
      'cache-control': 'no-cache, no-store, must-revalidate',
      'pragma': 'no-cache',
      'expires': '0',
      'x-content-type-options': 'nosniff',
      'service-worker-allowed': '/',
    },
  });
};
