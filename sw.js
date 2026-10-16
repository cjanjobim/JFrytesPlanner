// JFrytesPlanner service worker: app shell cached for offline use; schedule.json fetched network-first.
const VERSION = 'jfplanner-v1.2.1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './schedule.json',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never installs stale files.
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u =>
    fetch(new Request(u, { cache: 'reload' })).then(r => { if (!r.ok) throw new Error('shell ' + u); return c.put(u, r); })
  ))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const url = new URL(req.url);

  // Schedule data: try the network, fall back to the saved copy.
  if (url.pathname.endsWith('/schedule.json')) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true })));
    return;
  }

  // App shell: serve from cache, refresh in the background (bypassing the HTTP cache).
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(cached => {
    const network = fetch(new Request(req.url, { cache: 'reload', credentials: 'same-origin' })).then(res => {
      if (res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => cached);
    if (cached) return cached;
    return network.then(res => res || (req.mode === 'navigate' ? caches.match('./index.html') : res));
  }));
});
