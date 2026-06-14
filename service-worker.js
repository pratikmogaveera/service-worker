// Pre-cache fallback resources during install.
// addAll is atomic — if any fetch fails, install fails and SW won't activate.
async function precacheResources() {
  const cache = await caches.open('v1');
  await cache.addAll(["/fallback.html", "/assets/rock.avif"]);
}

// Network-first strategy for navigation requests.
// Try network → on failure, serve cached fallback.
async function handleNavigationNetworkFirst(event) {
  const { request } = event;
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Failed fetch request.')
    return caches.match("/fallback.html")
  }
}

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
        const cache = await caches.open('v1')
        cache.put(request, resClone)
      }

      return response
    });
  }
}

self.addEventListener('install', (event) => {
  // skipWaiting: activate immediately, don't wait for old SW's tabs to close
  event.waitUntil(self.skipWaiting());
  // waitUntil: keep install alive until caching completes
  event.waitUntil(precacheResources());
  console.log("Service Worker Installed.");
});

self.addEventListener('activate', (event) => {
  // claim: take control of all open tabs without waiting for navigation
  event.waitUntil(self.clients.claim());
  console.log("Service Worker Activated.");
});

self.addEventListener('fetch', (event) => {
  // intercepting navigation and assets requests (HTML pages, and images)
  // respondWith must be called synchronously — async logic goes inside the promise

  if (event.request.mode === 'navigate')
    event.respondWith(handleNavigationNetworkFirst(event))
  else if (event.request.url.includes('/assets/'))
    event.respondWith(handleCacheFirst(event))
})
