# Service Worker Learning Plan — Phase 1

Plain HTML + JS. No frameworks. No build tools. Pure understanding.

---

## 1. Lifecycle

**Goal:** Understand how a service worker is born, takes control, and intercepts requests.

**Tasks:**
- Create a basic `index.html` and `sw.js`
- Register the service worker from a script in the page
- Log each lifecycle event: `install`, `activate`, `fetch`
- Observe the lifecycle in DevTools → Application → Service Workers
- Experiment with `skipWaiting()` and `clients.claim()` — understand when and why you'd use them
- Understand the "waiting" state and what triggers activation of a new SW

**Key Concepts:**
- Registration scope
- Install → waiting → activate flow
- Why a new SW doesn't take over immediately (tab still using old one)
- `event.waitUntil()` and its purpose

**Done when:** You can explain the full lifecycle to someone, predict what happens on refresh vs hard refresh, and see the transitions in DevTools.

---

## 2. Offline Fallback

**Goal:** Cache a fallback page during install, serve it when the network fails.

**Tasks:**
- Pre-cache an `offline.html` page during the `install` event
- Intercept `fetch` events for navigation requests
- If fetch fails (network down), respond with the cached offline page
- Test by going offline in DevTools → Network → Offline

**Key Concepts:**
- `caches.open()` and `cache.addAll()`
- `event.respondWith()` — taking over the browser's network layer
- Differentiating navigation requests from asset requests (`request.mode`)
- The Cache API is separate from browser HTTP cache

**Done when:** You go offline and see your custom offline page instead of Chrome's dinosaur.

---

## 3. Cache Strategies

**Goal:** Implement and understand the 3 core caching strategies.

**Tasks:**
- **Cache-first** — for static assets (CSS, images, fonts). Check cache, fallback to network.
- **Network-first** — for API calls or dynamic content. Try network, fallback to cache.
- **Stale-while-revalidate** — serve from cache immediately, fetch update in background for next time.
- Create multiple pages/assets to apply different strategies to different request types
- Observe behavior in DevTools Network tab (served from SW vs network)

**Key Concepts:**
- `cache.match()` and `cache.put()`
- Cloning responses (a response body can only be consumed once)
- URL pattern matching to route requests to the right strategy
- Trade-offs: speed vs freshness

**Done when:** You can open DevTools, go offline, and see cached assets load. Go online, see background updates happening for stale-while-revalidate resources.

---

## 4. Cache Versioning & Cleanup

**Goal:** Handle SW updates without leaving stale caches forever.

**Tasks:**
- Use versioned cache names (e.g., `static-v1`, `static-v2`)
- In the `activate` event, delete caches that don't match the current version
- Simulate an update: change the SW file, watch the new version install and clean up old caches
- Understand the full update flow: new SW detected → install → waiting → activate → cleanup

**Key Concepts:**
- `caches.keys()` to list all caches
- Filtering and deleting old caches
- Why cleanup happens in `activate` (not `install`)
- Cache storage limits and best practices

**Done when:** You update your SW, refresh, and see old caches removed in DevTools → Application → Cache Storage.

---

## 5. Background Sync

**Goal:** Queue actions while offline, replay them automatically when connectivity returns.

**Tasks:**
- Create a simple form that POSTs data (e.g., a message/note)
- If offline, store the request in IndexedDB
- Register a sync event with a tag
- In the SW's `sync` handler, read from IndexedDB and replay the request
- Test: submit form offline → go online → verify the request fires

**Key Concepts:**
- `SyncManager` and `registration.sync.register()`
- IndexedDB as the offline queue (Cache API is for responses, not pending requests)
- The `sync` event fires when the browser thinks connectivity is back
- Retry behavior and idempotency considerations

**Done when:** You submit data offline, go online, and see the request fire automatically without user action.

---

## 6. Push Notifications

**Goal:** Subscribe to push, receive messages from a server, display notifications.

**Tasks:**
- Generate VAPID keys (use a CLI tool or web-push library for this)
- Subscribe the user with `pushManager.subscribe()`
- Send the subscription to a simple server (can be a Node script)
- Trigger a push from the server
- Handle the `push` event in the SW and show a notification
- Handle `notificationclick` to open/focus a page

**Key Concepts:**
- VAPID authentication and why it exists
- Push subscription object (endpoint, keys)
- The push event fires in the SW even if the page is closed
- Notification permission model and UX best practices
- `self.registration.showNotification()`

**Done when:** You close the browser tab, send a push from your server, and see a notification appear. Clicking it opens your page.

---

## Project Structure (Expected Final State)

```
service-worker/
├── index.html
├── offline.html
├── sw.js
├── css/
│   └── style.css
├── js/
│   └── app.js
├── pages/          (for multi-page cache strategy demos)
├── server/         (minimal Node server for push notifications)
├── PLAN.md
├── README.md
└── .kiro/
    └── steering/
        └── basic.md
```

---

## Workflow

- One section at a time
- Write all code yourself
- Test in DevTools after each step
- Ask for review before moving to the next section
- Commit after each completed section
