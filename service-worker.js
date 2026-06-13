self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
  console.log("Service Worker Installed");
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
  console.log("Service Worker Activated");
});

self.addEventListener('fetch', (event) => {
  console.log(`Service Worker intercepted request: \n${event.request.method} | ${event.request.url}`);
})