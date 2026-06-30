const CACHE_NAME = "couple-ledger-v29"

const LOCAL_ASSETS = [
  "./manifest.json",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon.png",
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
