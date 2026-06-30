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
      reloaded = true
      window.location.reload()
    }

    navigator.serviceWorker
      .register("/sw.js")
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
      .catch(() => {})

    const onControllerChange = () => reloadOnce()
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange)

    const onInstall = (e: Event) => {
      e.preventDefault()
    }
    window.addEventListener("beforeinstallprompt", onInstall)
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange)
      window.removeEventListener("beforeinstallprompt", onInstall)
    }
  }, [])

  return null
}
