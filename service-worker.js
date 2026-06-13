// Pre-cache fallback resources during install.
// addAll is atomic — if any fetch fails, install fails and SW won't activate.
async function cacheFallbackResource() {
  const cache = await caches.open('v1');
  await cache.addAll(["/fallback.html"]);
}

// Network-first strategy for navigation requests.
// Try network → on failure, serve cached fallback.
async function handleFallbacks(event) {
  const { request } = event;
  try {
    return await fetch(request);
  } catch (error) {
    console.error('Failed fetch request.')
    return caches.match("/fallback.html")
  }
}

self.addEventListener('install', (event) => {
  // skipWaiting: activate immediately, don't wait for old SW's tabs to close
  event.waitUntil(self.skipWaiting());
  // waitUntil: keep install alive until caching completes
  event.waitUntil(cacheFallbackResource());
  console.log("Service Worker Installed.");
});

self.addEventListener('activate', (event) => {
  // claim: take control of all open tabs without waiting for navigation
  event.waitUntil(self.clients.claim());
  console.log("Service Worker Activated.");
});

self.addEventListener('fetch', (event) => {
  // Only intercept navigation requests (HTML pages, not CSS/JS/images)
  // respondWith must be called synchronously — async logic goes inside the promise
  if (event.request.mode === 'navigate')
    event.respondWith(handleFallbacks(event))
})
