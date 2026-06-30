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

    navigator.serviceWorker.register("/sw.js").catch(() => {})

    const onInstall = (e: Event) => {
      e.preventDefault()
    }
    window.addEventListener("beforeinstallprompt", onInstall)
    return () => window.removeEventListener("beforeinstallprompt", onInstall)
  }, [])

  return null
}
