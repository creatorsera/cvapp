// Service worker: network-first for the app shell, falling back to cache
// only when the network is unavailable (offline). This app's files change
// frequently during development, so a previous cache-first version of this
// file caused real staleness problems - it would serve an old cached copy
// even after a fresh deploy, and bumping CACHE_NAME didn't fully fix it,
// because the fetch this service worker itself makes to refresh its cache
// could still be served a stale response from the browser's own HTTP
// cache if the host sends long-lived cache headers on static assets. The
// { cache: "reload" } fetch option below forces a true network round trip
// during install, bypassing that layer.
// Only caches what this app itself needs — no analytics, no third-party
// trackers.

const CACHE_NAME = "cv-builder-v8";

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
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map((url) =>
          fetch(url, { cache: "reload" }).then((response) => {
            if (response && response.ok) return cache.put(url, response);
          }).catch(() => {}) // one missing/offline asset shouldn't fail the whole install
        )
      )
    )
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
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isRuntimeLib = RUNTIME_HOSTS.includes(url.hostname);
  const isAppShell = url.origin === self.location.origin;

  if (!isAppShell && !isRuntimeLib) return; // don't intercept anything else

  // Network-first: always try to get the current version first. Only
  // fall back to whatever's cached if the network request actually fails
  // (i.e. genuinely offline), which is the one situation this cache
  // exists for. This means online users always see the latest deploy,
  // never a stale cached copy from a previous visit.
  event.respondWith(
    fetch(event.request, { cache: "no-store" }).then((response) => {
      if (response && response.ok) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});
