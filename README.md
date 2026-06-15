# Service Worker — Phase 1

Learning service workers from scratch with plain HTML + JS. No frameworks, no build tools.

## Purpose

Build a deep mental model of service worker internals before applying them in production with framework abstractions (Phase 2).

## Tech Stack

- Plain HTML + JS
- No frameworks, no build tools
- Static server via `npx serve .`

## How to Run

```bash
npx serve .
```

Open `http://localhost:3000` and use DevTools → Application → Service Workers to observe behavior.

## File Structure

```
service-worker/
├── index.html          — entry point
├── fallback.html       — offline fallback page (self-contained)
├── app.js              — SW registration logic
├── service-worker.js   — service worker lifecycle + cache strategies
├── style.css           — base styles
├── assets/             — static images (cache-first targets)
├── PLAN.md             — learning roadmap
└── NOTES.md            — concepts and Q&A
```

## Progress

- [x] Lifecycle
- [x] Offline fallback
- [x] Cache strategies
- [ ] Cache versioning & cleanup
- [ ] Background sync
- [ ] Push notifications

## Resources

- [MDN — Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN — Using Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)
- [web.dev — Service Workers](https://web.dev/learn/pwa/service-workers)
