// Service worker: програма працює без інтернету.
// VERSION має збігатися з ?v= у index.html (оновлюйте обидва через tools/bump-version.sh).
const VERSION = 12;
const CACHE = 'fitduo-v' + VERSION;
const FILES = ['foods', 'dishes', 'exercises', 'figures', 'storage', 'calc', 'plan', 'charts', 'app', 'foodcalc', 'onboarding', 'player'];
const ASSETS = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  `css/style.css?v=${VERSION}`, ...FILES.map(f => `js/${f}.js?v=${VERSION}`)];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // сторінка — спершу з мережі (щоб підтягувати оновлення), без мережі — з кешу
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // решта файлів версійовані — спершу з кешу
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok && new URL(req.url).origin === location.origin) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
