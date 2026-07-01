const CACHE_NAME = "couple-ledger-v30"

const LOCAL_ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png",
  // 底部导航栏图标
  "./tabbar/home.png",
  "./tabbar/home-active.png",
  "./tabbar/flow.png",
  "./tabbar/flow-active.png",
  "./tabbar/record.png",
  "./tabbar/record-active.png",
  "./tabbar/review.png",
  "./tabbar/review-active.png",
  "./tabbar/mine.png",
  "./tabbar/mine-active.png",
  // 系统头像
  "./sys-av-1.png",
  "./sys-av-2.png",
  "./sys-av-3.png",
  "./sys-av-4.png",
  "./sys-av-5.png",
  "./sys-av-6.png",
  "./sys-av-7.png",
  "./sys-av-8.png",
  "./sys-av-9.png",
  "./sys-av-10.png",
  // RoomSetup 角色图
  "./avatars/girl.jpg",
  "./avatars/boy.jpg",
]

/** Next.js 动态资源不缓存，避免刷新后 JS 不匹配 */
function shouldCache(url) {
  if (url.pathname.startsWith("/_next/")) return false
  if (url.pathname.startsWith("/api/")) return false
  return LOCAL_ASSETS.some((p) => url.pathname === p.replace("./", "/") || url.pathname.endsWith(p.slice(1)))
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(LOCAL_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  if (!shouldCache(url)) return

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
