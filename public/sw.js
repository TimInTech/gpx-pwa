// Service Worker for GPX Route Manager PWA
const CACHE_NAME = "gpx-manager-v1"
const STATIC_CACHE = "gpx-static-v1"
const DYNAMIC_CACHE = "gpx-dynamic-v1"
const TILES_CACHE = "gpx-tiles-v1"

// App shell - critical files for offline functionality
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192-maskable.png",
  // Next.js will generate these, but we'll cache them dynamically
]

// OpenStreetMap tile URL pattern
const TILE_URL_PATTERN = /^https:\/\/[abc]\.tile\.openstreetmap\.org\/\d+\/\d+\/\d+\.png$/

// Maximum number of tiles to cache (approximately 50MB at ~25KB per tile)
const MAX_TILES = 2000
const MAX_DYNAMIC_CACHE_SIZE = 50

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker")

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching app shell")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log("[SW] App shell cached")
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error("[SW] Failed to cache app shell:", error)
      }),
  )
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker")

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== TILES_CACHE) {
                console.log("[SW] Deleting old cache:", cacheName)
                return caches.delete(cacheName)
              }
            }),
          )
        }),
      // Take control of all clients
      self.clients.claim(),
    ]),
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Handle different types of requests with appropriate caching strategies

  // 1. App shell and static assets - Cache First
  if (
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.includes("/_next/static/")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE))
    return
  }

  // 2. Map tiles - Cache First with size limit
  if (TILE_URL_PATTERN.test(request.url)) {
    event.respondWith(handleTileRequest(request))
    return
  }

  // 3. API routes and dynamic content - Network First
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/_next/")) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // 4. Navigation requests - Network First with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request))
    return
  }

  // 5. Everything else - Network First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE))
})

// Cache First strategy - good for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error("[SW] Cache first failed:", error)
    return new Response("Offline", { status: 503 })
  }
}

// Network First strategy - good for dynamic content
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())

      // Limit cache size
      limitCacheSize(cacheName, MAX_DYNAMIC_CACHE_SIZE)
    }

    return networkResponse
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url)

    const cache = await caches.open(cacheName)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    })
  }
}

// Special handling for map tiles with size limits
async function handleTileRequest(request) {
  try {
    const cache = await caches.open(TILES_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      // Only cache successful tile responses
      cache.put(request, networkResponse.clone())

      // Limit tile cache size
      limitCacheSize(TILES_CACHE, MAX_TILES)
    }

    return networkResponse
  } catch (error) {
    console.log("[SW] Tile request failed:", request.url)

    // Return a placeholder tile or cached version
    const cache = await caches.open(TILES_CACHE)
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // Return a simple gray tile as fallback
    return new Response(createOfflineTile(), {
      headers: { "Content-Type": "image/png" },
    })
  }
}

// Handle navigation requests with offline fallback
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request)
    return networkResponse
  } catch (error) {
    console.log("[SW] Navigation offline, serving cached app")

    const cache = await caches.open(STATIC_CACHE)
    const cachedResponse = await cache.match("/")

    if (cachedResponse) {
      return cachedResponse
    }

    return new Response("App offline", { status: 503 })
  }
}

// Limit cache size by removing oldest entries
async function limitCacheSize(cacheName, maxSize) {
  try {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()

    if (keys.length > maxSize) {
      console.log(`[SW] Limiting ${cacheName} cache size: ${keys.length} -> ${maxSize}`)

      // Remove oldest entries (FIFO)
      const keysToDelete = keys.slice(0, keys.length - maxSize)
      await Promise.all(keysToDelete.map((key) => cache.delete(key)))
    }
  } catch (error) {
    console.error("[SW] Failed to limit cache size:", error)
  }
}

// Create a simple gray tile for offline fallback
function createOfflineTile() {
  // Simple 256x256 gray PNG tile
  const canvas = new OffscreenCanvas(256, 256)
  const ctx = canvas.getContext("2d")

  ctx.fillStyle = "#f0f0f0"
  ctx.fillRect(0, 0, 256, 256)

  ctx.fillStyle = "#ccc"
  ctx.font = "14px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Offline", 128, 128)

  return canvas.convertToBlob({ type: "image/png" })
}

// Handle background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync:", event.tag)

  if (event.tag === "background-sync") {
    event.waitUntil(handleBackgroundSync())
  }
})

async function handleBackgroundSync() {
  try {
    // Sync any pending route uploads or updates
    console.log("[SW] Performing background sync")

    // This would sync with a backend if we had one
    // For now, just log that sync completed
    console.log("[SW] Background sync completed")
  } catch (error) {
    console.error("[SW] Background sync failed:", error)
  }
}

// Handle push notifications (future feature)
self.addEventListener("push", (event) => {
  console.log("[SW] Push received")

  const options = {
    body: "GPX Route Manager update available",
    icon: "/icon-192.png",
    badge: "/icon-192-maskable.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "/icon-192.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "/icon-192.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("GPX Route Manager", options))
})
