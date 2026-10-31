// Kasse: offline-fähig. Bei jeder neuen Version CACHE hochzählen.
const CACHE = "kasse-v1";
const LOCAL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL)).then(() => self.skipWaiting())));
self.addEventListener("activate", e => e.waitUntil(caches.keys()
  .then(ks => Promise.all(ks.filter(k => k.startsWith("kasse-") && k !== CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // erst Netz (frische Version); nach 2,5 s ohne Antwort die gespeicherte Version
  const net = fetch(e.request.url, {cache: "no-cache", credentials: "same-origin"}).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return r;
  });
  const cached = () => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("index.html"));
  e.respondWith(new Promise(res => {
    let done = false; const fin = r => { if (!done && r) { done = true; res(r); } };
    const t = setTimeout(() => cached().then(r => r ? fin(r) : net.then(fin, () => {})), 2500);
    net.then(r => { clearTimeout(t); fin(r); }, () => { clearTimeout(t); cached().then(r => fin(r || Response.error())); });
  }));
});
