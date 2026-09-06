// Service worker: cache-first for the app shell, so the app works offline
// after the first successful load. Only caches what this app itself needs —
// no analytics, no third-party trackers.

const CACHE_NAME = "cv-builder-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// External libraries used for exporting — cached on first successful fetch
// so PDF/DOCX export keeps working offline after the first run.
const RUNTIME_HOSTS = ["cdnjs.cloudflare.com", "unpkg.com"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isRuntimeLib = RUNTIME_HOSTS.includes(url.hostname);
  const isAppShell = url.origin === self.location.origin;

  if (!isAppShell && !isRuntimeLib) return; // don't intercept anything else

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
