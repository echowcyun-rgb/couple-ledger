"use client"

import { useEffect } from "react"

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      // 开发模式卸载 SW，避免旧缓存导致刷新后 JS 不加载、卡在「加载中」
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => void r.unregister())
      })
      return
    }

    let reloaded = false
    const reloadOnce = () => {
      if (reloaded) return
      // 首次安装尚无 controller，跳过 reload 避免加载两次
      if (!navigator.serviceWorker.controller) return
      reloaded = true
      window.location.reload()
    }

    const checkUpdate = () => {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) void reg.update()
      })
    }

    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((reg) => {
        void reg.update()
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing
          if (!worker) return
          worker.addEventListener("statechange", () => {
            if (worker.state === "activated" && navigator.serviceWorker.controller) {
              reloadOnce()
            }
          })
        })
      })
      .catch((err) => {
        console.warn("[PWA] Service Worker 注册失败:", err)
        window.dispatchEvent(
          new CustomEvent("ledger-cloud-error", {
            detail: "PWA 离线缓存注册失败，可刷新页面重试",
          })
        )
      })

    const onControllerChange = () => reloadOnce()
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    const onVisible = () => {
      if (document.visibilityState === "visible") checkUpdate()
    }
    document.addEventListener("visibilitychange", onVisible)

    const onInstall = (e: Event) => {
      e.preventDefault()
    }
    window.addEventListener("beforeinstallprompt", onInstall)

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("beforeinstallprompt", onInstall)
    }
  }, [])

  return null
}
