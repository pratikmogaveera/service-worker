const CACHE_VERSION = 'static-v1'

async function clearOldCaches() {
  const cache = await caches.keys()
  console.log('CACHE:', cache)

  for (let cacheVersion of cache) {
    if (cacheVersion !== CACHE_VERSION)
      await caches.delete(cacheVersion)
  }
}

// Pre-cache critical resources during install.
// addAll is atomic — if any fetch fails, install fails and SW won't activate.
async function precacheResources() {
  const cache = await caches.open(CACHE_VERSION);
  await cache.addAll(["/fallback.html"]);
}

// Cache-first: check cache → return if hit.
// On miss: fetch from network → clone + cache for next time → return original.
async function handleCacheFirst(event) {
  const { request } = event;
  const cachedAsset = await caches.match(request);
  if (cachedAsset)
    return cachedAsset
  else {
    console.log('Cache miss, fetching from network:', request.url)
    return await fetch(request).then(async (response) => {
      if (response.ok) {
        const resClone = response.clone()
        const cache = await caches.open(CACHE_VERSION)
        cache.put(request, resClone)
      }

      return response
    });
  }
}

// Network-first: try network → clone + cache on success → return.
// On failure: serve from cache if available, else fallback page (navigation) or 408 (sub-resources).
async function handleNetworkFirst(event) {
  const { request } = event
  const cache = await caches.open(CACHE_VERSION)
  try {
    return await fetch(request).then((response) => {
      if (response.ok) {
        const resClone = response.clone()
        cache.put(request, resClone)
      }

      return response
    })
  } catch (error) {
    console.log('Network fail, fetching from cache:', request.url)
    const cachedResponse = await cache.match(request)
    if (cachedResponse)
      return cachedResponse
    else {
      console.log('Network fail, Cache miss')
      if (request.mode === 'navigate')
        return caches.match("/fallback.html")
      else
        return new Response('Network error', { status: 408 })
    }
  }
}

// Stale-while-revalidate: return cached response instantly for speed,
// then fetch fresh version in background to update cache for next time.
// Trade-off: data is at most one request behind, but page loads are instant.
async function handleStaleWhileRevalidate(event) {
  const { request } = event
  const cache = await caches.open(CACHE_VERSION)
  try {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      const res = fetch(request)
        .then((res) => {
          if (res.ok)
            cache.put(request, res)
        })
        .catch((err) => console.log('Error while revalidating cached response:', err))
      return cachedResponse
    } else {
      return await fetch(request).then((response) => {
        if (response.ok) {
          const resClone = response.clone()
          cache.put(request, resClone)
        }

        return response
      })
    }

  } catch (error) {
    const cachedResponse = await cache.match(request)
    if (cachedResponse)
      return cachedResponse
    else
      return new Response('Network error', { status: 408 })
  }
}

self.addEventListener('install', (event) => {
  // skipWaiting: activate immediately, don't wait for old SW's tabs to close
  event.waitUntil(self.skipWaiting());
  // waitUntil: keep install alive until caching completes
  event.waitUntil(precacheResources());
  console.log("Service Worker Installed.");
});

self.addEventListener('activate', async (event) => {
  // claim: take control of all open tabs without waiting for navigation
  event.waitUntil(self.clients.claim());
  event.waitUntil(clearOldCaches())
  console.log("Service Worker Activated.");
});

self.addEventListener('fetch', (event) => {
  // Route requests to strategies: assets → cache-first, everything else → network-first.
  // respondWith must be called synchronously — async logic goes inside the promise.

  if (event.request.url.includes('/assets/'))
    event.respondWith(handleCacheFirst(event))
  else if (event.request.url === 'https://time.now/developer/api/timezone/Asia/Kolkata') {
    event.respondWith(handleStaleWhileRevalidate(event))
  }
  else {
    event.respondWith(handleNetworkFirst(event))
  }
})
