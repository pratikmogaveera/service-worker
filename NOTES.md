# Service Worker — Learning Notes

## 1. Lifecycle

### Key Concepts

- A service worker is a **programmable network proxy** — it sits between the page and the network, intercepting every request the page makes.
- Lifecycle: **register → install → waiting → activate → controlling (fetch)**
- On first registration, the SW installs and activates but does NOT control the current page until the next navigation (refresh).
- The browser byte-compares the SW file on each page load — if even one byte changes, it triggers a new install.
- A new SW won't activate while the old one is still controlling tabs (consistency guarantee).

### APIs Learned

| API | Where | Purpose |
|-----|-------|---------|
| `navigator.serviceWorker.register()` | Page JS | Registers the SW file |
| `self.skipWaiting()` | install event | Skip waiting state, activate immediately |
| `self.clients.claim()` | activate event | Take control of all open tabs without waiting for navigation |
| `event.waitUntil(promise)` | install/activate | Keep the event alive until async work completes; failure = failed install/activate |
| `event.request` | fetch event | The intercepted Request object (method, url, headers, mode, etc.) |

### What the fetch event intercepts

Everything — HTML documents, CSS, JS, images, favicons, fonts, API calls. Every network request from a controlled page flows through the SW's fetch handler.

---

## Q&A

### Why doesn't the browser activate a new SW immediately?

The old SW may have cached assets in a specific format/version. The page was loaded expecting those resources. If the new SW activates mid-session and deletes old caches or changes behavior, the page could break — you'd get a mix of old HTML with new assets, or missing resources. The browser ensures one SW version serves the entire lifecycle of a page load for consistency.

### What happens if the promise in `waitUntil()` rejects?

The install or activate step is considered **failed**. For install, the SW won't move to the waiting/activated state. The browser discards it and will retry on the next page load.

### When should you use `skipWaiting` + `clients.claim` in production?

Sparingly. Only when you know the update is backward-compatible and won't break currently open pages. Common use case: critical bug fixes you need deployed immediately. For most updates, let the natural lifecycle handle the transition safely.

### Where do SW logs appear in DevTools?

In the Console — but the SW has its own execution context. Make sure the Console context dropdown isn't filtering to just "top" (the page). You can also see logs via Application → Service Workers → the specific SW.

---

## 2. Offline Fallback

### Key Concepts

- The **Cache API** is a key-value store (Request → Response) that you control — separate from the browser's HTTP cache.
- **Pre-caching** during install ensures critical resources are available before the SW goes live.
- `cache.addAll()` is atomic — if any resource fails to fetch, the entire install fails. The SW never activates in a half-ready state.
- `event.respondWith()` must be called **synchronously** in the fetch handler — pass it a Promise that resolves to a Response.
- For offline fallback, only intercept **navigation requests** (`request.mode === 'navigate'`). Other requests (CSS, JS, images) pass through normally unless you explicitly handle them.
- A fallback page should be **self-contained** (inline CSS) — external stylesheets won't load if you're only caching the HTML.

### APIs / Tools Learned

| API | Purpose |
|-----|---------|
| `caches.open(name)` | Open (or create) a named cache |
| `cache.addAll([urls])` | Fetch and cache multiple resources atomically |
| `caches.match(request)` | Search all caches for a matching response |
| `event.respondWith(promise)` | Take over the browser's response for a request |
| `request.mode` | Identifies request type: `'navigate'`, `'cors'`, `'no-cors'`, etc. |

### Pattern: Network-first with offline fallback

```
try network → success: return response
            → failure: return cached fallback
```

---

## Q&A

### What happens if `cache.addAll()` fails?

The promise rejects → `waitUntil` receives a rejected promise → the install is considered **failed**. The SW goes to "redundant" state, never activates. The browser retries on the next page load. This is intentional — atomic guarantee that the SW only goes live with all required resources cached.

### Why must `respondWith()` be called synchronously?

The browser needs to know immediately whether the SW is handling this request or not. If you `await` something first, the synchronous window closes and the browser proceeds with the normal network request. Pass the entire async logic as a Promise to `respondWith`.

### Why inline CSS for the fallback page?

When offline, only navigation requests get the cached fallback. The CSS request is not a navigation (`request.mode !== 'navigate'`), so it falls through to the network and fails. Inlining makes the page self-contained.

## 3. Cache Strategies — Cache-First

### Key Concepts

- **Cache-first**: check cache → if hit, return immediately (no network). If miss → fetch from network → cache the response → return it.
- A `Response` body is a **stream** — it can only be consumed once. To use it in two places (cache + page), you must call `response.clone()` before either consumer reads it.
- `cache.put(request, response)` stores a response you already have. Unlike `cache.add()`, it doesn't fetch — avoids a redundant network request.
- Always check `response.ok` before caching — don't pollute the cache with 404s or 500s.
- Pre-caching during install seeds the cache for critical assets. Dynamic caching on miss handles everything else.
- Cross-origin (opaque) responses have `response.ok === false` and count ~7MB against cache quota — avoid caching external URLs with this strategy.

### APIs / Tools Learned

| API | Purpose |
|-----|---------|
| `response.clone()` | Create a copy with an independent body stream |
| `cache.put(request, response)` | Store a response you already have (no fetch) |
| `response.ok` | Boolean — `true` if status is 200–299 |

### Pattern: Cache-first with dynamic caching

```
check cache → hit: return cached response
            → miss: fetch from network
                    → success + ok: clone, cache.put(clone), return original
                    → success + !ok: return response (don't cache)
```

### Routing

Route requests to strategies based on URL patterns in the fetch handler using `if/else if`. Use `event.request.url.includes()` for simple matching.

---

### Q&A

### Why use `cache.put()` instead of `cache.add()` for dynamic caching?

`cache.add(url)` fetches the resource itself and stores the result. If you've already fetched it (to return to the page), using `add()` would fetch it a second time. `cache.put()` lets you store the response you already have.

### Why clone before caching, not after?

Once a stream is read, it's consumed. If you pass the original to the cache and then try to return it to the page, the page gets an empty body. Clone first, then each copy has its own unread stream.

## 3b. Cache Strategies — Network-First

### Key Concepts

- **Network-first**: always try network → on success, clone + cache the response (keeps cache fresh) → return original. On failure → serve stale cached version if available.
- Best for resources that change frequently but should still work offline (HTML pages, CSS, JS, API responses).
- The cache acts as a **safety net**, not the primary source — you always want the freshest version when online.
- Handle the "both fail" case (network down + never cached): return a fallback page for navigation, or a synthetic error response for sub-resources.

### APIs / Tools Learned

| API | Purpose |
|-----|---------|
| `new Response(body, init)` | Create a synthetic response (e.g., for error states) |
| `cache.match(request)` | Instance method — search a specific cache (vs `caches.match` which searches all) |

### Pattern: Network-first with caching

```
try network → success + ok: clone, cache.put(clone), return original
            → success + !ok: return response (don't cache)
            → failure: check cache
                       → hit: return stale cached response
                       → miss + navigate: return /fallback.html
                       → miss + sub-resource: return 408 Response
```

### Routing Strategy

```
/assets/*        → cache-first (static, rarely changes)
everything else  → network-first (HTML, CSS, JS — want freshness)
```

---

### Q&A

### Why cache on every successful network response?

The cache stays fresh. Next time you go offline, you have the most recent version — not a stale copy from the first visit.

### Why separate handling for navigation vs sub-resource on total failure?

A user navigating to a page expects to see *something* — the fallback page communicates "you're offline." A failed CSS or JS request doesn't warrant a full HTML page response — a 408 lets the browser handle it naturally.

### Why is the cache empty (only fallback.html) after the first page load?

The SW installs and activates during the first load, but the page's requests are already in-flight before the SW takes control. Even with `skipWaiting()` + `clients.claim()`, those initial requests bypass the fetch handler. On the second load (refresh), the SW is controlling — requests flow through the fetch handler and get cached via network-first. Going offline between 1st and 2nd load gives you only `fallback.html`.

## 3c. Cache Strategies — Stale-While-Revalidate

### Key Concepts

- **Stale-while-revalidate**: serve from cache instantly (speed), fire a background fetch to update the cache for next time.
- Data is at most **one request behind** — not stale forever like cache-first, because every serve triggers a background refresh.
- Best for content where instant load matters more than absolute freshness (blog posts, profile data, non-critical API responses).
- The background fetch is **fire-and-forget** — don't await it, don't let it block the response to the page.
- On cache miss (first visit), fall through to network and wait — no choice, there's nothing cached yet.
- No need to clone in the background revalidation path — you're not using that response for anything else.

### Pattern: Stale-while-revalidate

```
check cache → hit: return cached response immediately
                   + fire background fetch → on success + ok: cache.put(fresh response)
                                           → on failure: silently ignore (.catch)
            → miss: fetch from network → clone, cache.put(clone), return original
```

### Trade-offs vs Other Strategies

| Strategy | Speed | Freshness | Offline |
|----------|-------|-----------|---------|
| Cache-first | Instant | Stale forever (until SW update) | ✅ |
| Network-first | Slow (waits for network) | Always fresh | ✅ (if cached) |
| Stale-while-revalidate | Instant | One request behind | ✅ (if cached) |

### Routing Strategy (Final)

```
/assets/*           → cache-first (static, rarely changes)
external API calls  → stale-while-revalidate (speed > freshness)
everything else     → network-first (HTML, CSS, JS — want freshness)
```

---

### Q&A

### Why not clone the response in the background revalidation?

You're not using that response anywhere else — it goes straight into `cache.put()`. Cloning is only needed when you want to consume the response in two places (return to page + store in cache).

### Why add `.catch()` to the background fetch?

If the network fails during revalidation, the promise rejects. Without `.catch()`, it becomes an unhandled promise rejection. Since the user already got the cached response, the failure is harmless — swallow it silently.

### When would you choose stale-while-revalidate over network-first?

When instant page load is more important than showing the absolute latest data. If showing stale data for one request is acceptable (e.g., a dashboard that updates every few seconds anyway), SWR gives you cache-first speed with eventual freshness.

## 4. Cache Versioning & Cleanup

### Key Concepts

- Use **versioned cache names** (e.g., `static-v1`, `static-v2`) so each SW update uses a distinct cache.
- On activate, delete all caches that don't match the current version — prevents stale data from accumulating indefinitely.
- Cleanup happens in **activate** (not install) because the old SW is still serving from the old cache until the new one activates. Deleting during install would break the still-active old SW.
- `caches.keys()` returns all cache names the origin owns — filter and delete the ones that aren't current.
- Cache API only supports **GET requests** — attempting `cache.put()` on a POST throws `TypeError`. Guard with `request.method === 'GET'` before caching.

### APIs / Tools Learned

| API | Purpose |
|-----|---------|
| `caches.keys()` | List all cache names owned by this origin |
| `caches.delete(name)` | Delete a named cache and all its entries |

### Pattern: Cache cleanup on activate

```
activate event → caches.keys()
              → filter: keep only caches !== CACHE_VERSION
              → delete each old cache
              → waitUntil(cleanup promise)
```

---

### Q&A

### Why not clean up old caches in the install event?

During install, the old SW is still active and serving responses from the old cache. If you delete it during install, the old SW has nothing to serve — users get broken pages until the new SW activates. Activate is the safe moment: the old SW is gone, its caches are no longer needed.

### What happens if you forget to delete old caches?

They accumulate forever. Each SW update creates a new cache (`v1`, `v2`, `v3`...) without removing old ones. Browser storage has limits (~origin gets a percentage of available disk). Eventually the browser may evict your data under storage pressure, or you'll waste user storage on stale assets.

### Why can't you cache POST requests?

The Cache API is keyed by Request (URL + method + headers). POST requests have a body that could vary — two POSTs to the same URL might have different payloads. The spec doesn't define how to match them, so it's disallowed. Use IndexedDB for storing outgoing request data.

---

## 5. Background Sync (In Progress)

### Key Concepts

- **Problem solved**: user submits data while offline → without sync, the request fails silently. Background sync queues it and replays automatically when connectivity returns.
- **SyncManager API**: `registration.sync.register('tag')` — tells the browser "I have pending work." The browser fires a `sync` event in the SW when it thinks connectivity is back.
- The `sync` event fires in the **service worker**, even if the page is closed.
- The browser may **retry** if the sync handler's promise rejects — so requests should be idempotent (safe to send twice).
- **Browser support**: Chromium-based only. Check `'SyncManager' in window` before using.

### Why IndexedDB (not Cache API) for pending requests?

- Cache API stores **Responses** (what came back from the network).
- Background sync needs to store **outgoing request data** (what needs to be sent).
- IndexedDB is a general-purpose key-value store for arbitrary structured data — perfect for queuing request payloads.

### IndexedDB Mental Model

| Concept | Analogy |
|---------|---------|
| Database | A PostgreSQL database (named, versioned) |
| Object Store | A table (named collection of records) |
| Transaction | All reads/writes happen inside one (like SQL transactions) |
| Key | Primary key per record (can auto-increment) |

### IndexedDB Core API

| API | Purpose |
|-----|---------|
| `indexedDB.open(name, version)` | Open/create a database (returns IDBOpenDBRequest) |
| `onupgradeneeded` | Only place to create/delete object stores (fires on create or version bump) |
| `onsuccess` | DB ready — `event.target.result` is the db instance |
| `db.transaction(storeName, mode)` | Start a transaction (`'readonly'` or `'readwrite'`) |
| `store.add(data)` | Insert a record |
| `store.getAll()` | Read all records |
| `store.delete(key)` | Delete by key |
| `store.clear()` | Delete all records |

### Key Gotchas

- `indexedDB.open()` returns a **request**, not the database itself. The db comes from `event.target.result` in the `onsuccess` handler.
- Object stores can **only** be created inside `onupgradeneeded`.
- Everything is **event-based** (not Promise-based) — wrap in Promises for ergonomics.
- The second arg to `indexedDB.open()` is a **version number** (integer), not an options object.
- IndexedDB is accessible from **both** the page and the service worker — same database, shared.
- Transactions auto-close after all requests complete — can't reuse a closed transaction.

### Architecture Decision: Page-Side Approach

For form submission sync, handle offline detection in the **page** (not the SW fetch handler):

```
Page: submit → try fetch → fail → store in IndexedDB + sync.register('tag')
SW:   sync event fires → read from IndexedDB → replay fetch → clear on success
```

**Why page-side over SW-side:**
- Page already has structured data (form values) — no need to clone/parse request streams
- Clearer separation: page handles intent, SW handles replay
- Industry standard pattern (Workbox recommends this)

### Status

- [x] Form created (POST name to jsonplaceholder.typicode.com/users)
- [x] POST caching bug fixed (only cache GET requests)
- [ ] IndexedDB helper functions (db.js)
- [ ] Offline detection + store in IndexedDB (app.js)
- [ ] Sync event handler in SW
- [ ] End-to-end test: offline submit → online replay