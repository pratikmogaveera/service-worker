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
