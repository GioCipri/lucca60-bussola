// Service worker: salva l'app sul telefono per usarla senza rete.
// Cambia VERSION a ogni aggiornamento dei file per forzare il rinnovo della cache.
const VERSION = "lucca60-v1";
const FONT_CACHE = "lucca60-fonts";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONT_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Google Fonts: dalla cache se c'è, altrimenti rete e salva
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok || res.type === "opaque") cache.put(req, res.clone());
          return res;
        } catch (e) {
          return new Response("", {status: 503});
        }
      })
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Pagina: prima la rete (per avere il programma aggiornato), poi la cache se offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => { caches.open(VERSION).then(c => c.put("./index.html", res.clone())); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Altri file dell'app: prima la cache, poi la rete
  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});
