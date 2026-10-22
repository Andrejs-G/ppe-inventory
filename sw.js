// Offline cache for the PPE home-screen app. The version changes on every build, so a new build replaces the old cache.
// Cache first: the app opens from the phone at once, even on ship Wi-Fi with no internet where requests hang;
// a fresh copy is fetched in the background and used on the next launch.
const CACHE = "ppe-08206b31f5";
const FILES = ["./", "index.html", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"];
const OPT = {ignoreSearch: true, ignoreVary: true};
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
function timeout(p, ms){ return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); }); }
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const key = req.mode === "navigate" ? "index.html" : req;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = (await cache.match(key, OPT)) || (await caches.match(key, OPT));
    const net = fetch(req, {cache: "no-cache"}).then(r => { if (r.ok) cache.put(key, r.clone()); return r; });
    if (hit) { e.waitUntil(timeout(net, 30000).catch(() => {})); return hit; }
    try { return await timeout(net, 8000); }
    catch (err) { return (await caches.match("index.html", OPT)) || Response.error(); }
  })());
});
