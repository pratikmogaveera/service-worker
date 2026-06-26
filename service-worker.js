import { openDb, addToStore, deleteFromStore, getAllFromStore } from "./db.js"

const CACHE_VERSION = 'static-v1'
const APP_URL = 'http://localhost:3000'

async function initializeIndexDB() {
  const db = await openDb()
  console.log('Initiliaze IDB:', db)
}

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

async function handleNotificationClick(event) {
  event.notification.close()

  const openClients = await clients.matchAll({ type: 'window' })
  const myClient = openClients.find(client => client.url.includes(APP_URL))
  if (myClient) myClient.focus()
  else await clients.openWindow(APP_URL)
}

// Network-first: try network → clone + cache on success → return.
// On failure (GET): serve from cache if available, else fallback page (navigation) or 408 (sub-resources).
// On failure (non-GET): serialize request into IndexedDB for background sync replay.
// Clone request before fetch — body stream is consumed by the failed fetch and can't be re-read.
async function handleNetworkFirst(event) {
  const { request } = event
  const requstClone = request.clone()
  const cache = await caches.open(CACHE_VERSION)
  try {
    return await fetch(request).then((response) => {
      if (response.ok && request.method === "GET") {
        const resClone = response.clone()
        cache.put(request, resClone)
      }

      return response
    })
  } catch (error) {
    if (request.method === "GET") {
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
    } else {
      // Queue failed non-GET request for background sync.
      // Headers and body must be serialized — IDB only stores structured-cloneable data.
      console.log(`Network fail, adding ${request.method} request to pending requests queue.`, request.url)
      await addToStore({
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: await requstClone.text()
      })

      // Register sync — browser will fire 'sync' event when connectivity returns.
      await self.registration.sync.register('replay-pending')

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

// Replay pending requests from IndexedDB when connectivity returns.
// Delete each entry only after successful fetch — if fetch fails, the promise rejects
// and the browser will retry the sync event later (entries remain in IDB).
async function handleReplayPendingRequests(event) {
  const pendingRequests = await getAllFromStore()
  for (let pendingRequest of pendingRequests) {
    const { id, url, method, body, headers } = pendingRequest
    const res = await fetch(url, {
      headers,
      method,
      body
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(`Request failed: ${response.status}`)
        await deleteFromStore(id)
        return response.json()
      })
      .then((json) => console.log(json))

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
  event.waitUntil(initializeIndexDB())
  console.log("Service Worker Activated.");
});

self.addEventListener('push', (event) => {
  const notification = event.data.json()
  const { title, body } = notification
  console.log("Notification received:", notification)
  event.waitUntil(self.registration.showNotification(title, { body }))
})

self.addEventListener('notificationclick', async (event) => {
  console.log("Notification clicked:", event)
  event.waitUntil(handleNotificationClick(event))
})

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

// Background sync: browser fires this event when it detects connectivity after a sync.register() call.
// waitUntil keeps the SW alive during replay; rejected promise triggers browser retry.
self.addEventListener('sync', (event) => {
  if (event.tag === 'replay-pending') {
    event.waitUntil(handleReplayPendingRequests())
  }
})
