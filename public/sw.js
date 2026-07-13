const CACHE_NAME = "logbook-static-v2";
const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/pwa-icon/192",
  "/pwa-icon/512",
];

function getRequestStrategy(request) {
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) {
    return "network-only";
  }
  if (request.mode === "navigate") return "navigation-network-first";
  if (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE_URLS.includes(url.pathname)
  ) {
    return "cache-first";
  }
  return "network-only";
}

self.__LOGBOOK_SW_POLICY__ = { getRequestStrategy };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("logbook-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const strategy = getRequestStrategy(event.request);

  if (strategy === "navigation-network-first") {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            "<!doctype html><html lang='ko'><meta charset='utf-8'><meta name='viewport' content='width=device-width'><title>Logbook</title><body><main><h1>Logbook</h1><p>오프라인입니다. 연결 후 다시 시도해주세요.</p></main></body></html>",
            { headers: { "Content-Type": "text/html; charset=utf-8" } },
          ),
      ),
    );
    return;
  }

  if (strategy === "cache-first") {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        if (cached) return cached;
        const response = await fetch(event.request);
        if (response.ok && response.type !== "opaque") {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      }),
    );
  }
});
