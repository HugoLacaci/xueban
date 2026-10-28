/* Service worker de Xuébàn: app shell + datos (diccionario, trazos, audio) para uso offline. */
const VERSION = "xueban-v2";
// Ruta base: "" en local, "/xueban" en GitHub Pages (se deduce del ámbito con el que se registró el SW).
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const SHELL = [`${BASE}/`, `${BASE}/manifest.webmanifest`, `${BASE}/icon.svg`, `${BASE}/icon-192.png`];
const DATA_CACHE = `${VERSION}-data`;
const SHELL_CACHE = `${VERSION}-shell`;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).catch(() => undefined));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

function isData(url) {
  const p = url.pathname.startsWith(BASE) ? url.pathname.slice(BASE.length) : url.pathname;
  return p.startsWith("/data/") || p.startsWith("/audio/") || p.startsWith("/videos/") || p.startsWith("/_next/static/") || /\.(woff2?|ttf|png|svg|wasm)$/.test(p);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // YouTube, Google Fonts, etc.
  if (url.pathname.startsWith(`${BASE}/api/`)) return;

  if (isData(url)) {
    // cache-first para datos inmutables
    event.respondWith(
      caches.open(DATA_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch {
          return hit ?? Response.error();
        }
      }),
    );
    return;
  }

  // páginas: network-first con respaldo en caché (offline)
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(async () => (await caches.match(req)) ?? (await caches.match(`${BASE}/`)) ?? Response.error()),
    );
  }
});
