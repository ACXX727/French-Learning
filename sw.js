// 离线缓存：首次打开后，断网也能用。
// 页面和课程文件（lessons/*.js）优先联网取最新版（断网时用缓存），所以新增课程不需要改这里。
// 图片、录音等静态资源优先用缓存；替换了同名图片时，把 CACHE 版本号加一。
const CACHE = 'lexique-v5';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'lessons/index.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function networkFirst(req, key) {
  return fetch(req)
    .then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key || req, copy)); } return r; })
    .catch(() => caches.match(key || req, { ignoreSearch: true }));
}

function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  }));
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') return e.respondWith(networkFirst(e.request, 'index.html'));
  const fresh = url.pathname.endsWith('.webmanifest') || /\/lessons\/[^/]+\.js$/.test(url.pathname);
  if (fresh) return e.respondWith(networkFirst(e.request, url.origin + url.pathname)); // 去掉 ?t= 防缓存参数，只存一份
  e.respondWith(cacheFirst(e.request));
});
