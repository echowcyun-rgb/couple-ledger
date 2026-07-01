const CACHE_NAME = "couple-ledger-v34"

const LOCAL_ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png",
  "./js/income-watch.js",
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

const ALLOWED_PATHS = new Set(
  LOCAL_ASSETS.map((p) => (p === "./" ? "/" : p.replace(/^\.\//, "/")))
)

/** Next.js 动态资源不缓存，避免刷新后 JS 不匹配 */
function shouldCache(url) {
  if (url.pathname.startsWith("/_next/")) return false
  if (url.pathname.startsWith("/api/")) return false
  return ALLOWED_PATHS.has(url.pathname)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          LOCAL_ASSETS.map((url) =>
            fetch(url)
              .then((res) => (res.ok ? cache.put(url, res) : Promise.resolve()))
              .catch((err) => console.warn("[SW] 缓存失败:", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => caches.open(CACHE_NAME))
      .then((cache) =>
        cache.keys().then((requests) =>
          Promise.all(
            requests
              .filter((req) => {
                const path = new URL(req.url).pathname
                return !ALLOWED_PATHS.has(path)
              })
              .map((req) => cache.delete(req))
          )
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  // HTML 文档始终走网络且 bypass HTTP 缓存，避免旧 shell 与新版 _next 资源不匹配
  if (
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    url.pathname === "/" ||
    url.pathname === ""
  ) {
    event.respondWith(fetch(event.request, { cache: "no-store" }))
    return
  }

  if (!shouldCache(url)) return

  // stale-while-revalidate：先返回缓存，后台更新
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()))
          }
          return response
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
