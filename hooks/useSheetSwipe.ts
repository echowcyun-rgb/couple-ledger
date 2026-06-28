import { useRef, type TouchEventHandler } from "react"

export function useSheetSwipe(onClose: () => void, enabled: boolean) {
  const startY = useRef(0)

  const onTouchStart: TouchEventHandler = (e) => {
    if (!enabled) return
    startY.current = e.touches[0].clientY
  }

  const onTouchEnd: TouchEventHandler = (e) => {
    if (!enabled) return
    const dy = e.changedTouches[0].clientY - startY.current
    if (dy > 80) onClose()
  }

  return { onTouchStart, onTouchEnd }
}
