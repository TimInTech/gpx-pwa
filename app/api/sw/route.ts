// app/api/sw/route.ts
export const GET = async () => {
  const sw = `
  const CACHE = 'gpx-pwa-v4';

  self.addEventListener('install', (e) => self.skipWaiting());

  self.addEventListener('activate', (e) => {
    e.waitUntil((async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
      await self.clients.claim();
    })());
  });

  self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // keine Dev-/internen Routen cachen
    if (url.pathname.startsWith('/_next') || url.pathname.startsWith('/api')) return;

    // HTML immer aus dem Netz (optional Offline-Fallback)
    if (req.mode === 'navigate') {
      event.respondWith(fetch(req).catch(async () => {
        const offline = await caches.match('/offline.html');
        return offline || new Response('Offline', { status: 503 });
      }));
      return;
    }

    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        // nur same-origin, ok
        if (net && net.ok && net.type === 'basic') {
          caches.open(CACHE).then(c => c.put(req, net.clone())).catch(() => {});
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
