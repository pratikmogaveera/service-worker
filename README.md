# Service Worker — Phase 1

Learning service workers from scratch with plain HTML + JS. No frameworks, no build tools.

## Purpose

Build a deep mental model of service worker internals before applying them in production with framework abstractions (Phase 2).

## Topics Covered

1. Lifecycle (register, install, activate, fetch)
2. Offline fallback page
3. Cache strategies (cache-first, network-first, stale-while-revalidate)
4. Cache versioning & cleanup
5. Background sync
6. Push notifications

## How to Run

Serve with any static server (service workers require HTTPS or localhost):

```bash
npx serve .
```

Then open `http://localhost:3000` and use DevTools → Application → Service Workers to observe behavior.

## Progress

- [ ] Lifecycle
- [ ] Offline fallback
- [ ] Cache strategies
- [ ] Cache versioning & cleanup
- [ ] Background sync
- [ ] Push notifications
