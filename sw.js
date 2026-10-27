/* 饿啦 离线缓存 Service Worker
   策略：缓存优先 + 后台静默更新（Stale-While-Revalidate 的强化版）。
   - 打开即秒出（永远先给缓存版，无网也完整可用）
   - 有网时后台拉最新版写入缓存，下一次打开生效
   - 首次安装预缓存全部核心文件
   - 导航请求（打开页面）在缓存缺失时兜底 index.html */
const CACHE = 'ela-v8';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('message', e => {
  // 页面点"立即更新"时触发：让等待中的新 SW 立即接管
  if (e.data === 'skip') self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit => {
      const net = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
