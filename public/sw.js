// Service worker de l'appli Basketlog : démarrage rapide et page hors ligne.
// Rien n'est mis en cache pour /api (connexion, abonnements, avis) : ces requêtes passent toujours par le réseau.
const VERSION = "bl-v3";
const STATIC = `${VERSION}-static`;
const ASSETS = `${VERSION}-assets`; // fichiers JS/CSS vus en navigation, limités en nombre
const MAX_ASSETS = 150;
const PRECACHE = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function keep(req, res) {
  const c = await caches.open(ASSETS);
  await c.put(req, res);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_ASSETS; i++) await c.delete(keys[i]);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Fichiers de l'application (versionnés par Next.js) et icônes : cache d'abord.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); e.waitUntil(keep(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Pages : toujours le réseau, pour des pronostics à jour. Hors ligne : page de secours.
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(async () => (await caches.match("/offline.html")) || Response.error()));
  }
});
