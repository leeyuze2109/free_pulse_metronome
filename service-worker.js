
const CACHE_NAME = "pulse-metronome-v1";

// Automatically use the correct GitHub Pages project folder.
const BASE_URL = self.registration.scope;

const CORE_FILES = [
  BASE_URL,
  new URL("index.html", BASE_URL).href,
  new URL("favicon.svg", BASE_URL).href
];

// Save the main website files on the device.
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_FILES);
      await self.skipWaiting();
    })()
  );
});

// Remove old versions of this app's cache.
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();

      await Promise.all(
        names
          .filter(name =>
            name.startsWith("pulse-metronome-") &&
            name !== CACHE_NAME
          )
          .map(name => caches.delete(name))
      );

      await self.clients.claim();
    })()
  );
});

// Load pages from the internet when possible,
// but fall back to the saved page when offline.
self.addEventListener("fetch", event => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Do not intercept requests to other websites.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);

        try {
          const response = await fetch(request);

          if (response.ok) {
            await cache.put(request, response.clone());
          }

          return response;
        } catch {
          return (
            await cache.match(request) ||
            await cache.match(BASE_URL) ||
            await cache.match(
              new URL("index.html", BASE_URL).href
            ) ||
            new Response(
              "PULSE is offline. Open the website online once, then try again.",
              {
                status: 503,
                headers: {
                  "Content-Type": "text/plain; charset=utf-8"
                }
              }
            )
          );
        }
      })()
    );

    return;
  }

  // Save other successful local files as they are requested.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const saved = await cache.match(request);

      if (saved) return saved;

      try {
        const response = await fetch(request);

        if (response.ok && response.type === "basic") {
          await cache.put(request, response.clone());
        }

        return response;
      } catch {
        return new Response(
          "This file is not available offline.",
          { status: 503 }
        );
      }
    })()
  );
});
