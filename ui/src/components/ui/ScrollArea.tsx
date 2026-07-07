import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ScrollAreaProps {
  children: ReactNode
  className?: string
}

/**
 * Horizontal scroll container that hides the native scrollbar and renders its
 * own rounded, draggable handle (mirrors master's ScrollArea). Vertical mouse
 * wheel and drag-on-content also scroll horizontally.
 */
export function ScrollArea({ children, className = '' }: ScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [handle, setHandle] = useState({ width: 0, left: 0, visible: false })
  const drag = useRef<{ startX: number; startScroll: number } | null>(null)

  const recompute = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollWidth, clientWidth, scrollLeft } = el
    if (scrollWidth <= clientWidth + 1) {
      setHandle((h) => (h.visible ? { ...h, visible: false } : h))
      return
    }
    const ratio = clientWidth / scrollWidth
    const width = Math.max(ratio * clientWidth, 40)
    const maxScroll = scrollWidth - clientWidth
    const left = (scrollLeft / maxScroll) * (clientWidth - width)
    setHandle({ width, left, visible: true })
  }, [])

  useLayoutEffect(() => {
    recompute()
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    return () => ro.disconnect()
  }, [recompute])

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollRef.current
    if (!el) return
    // Translate vertical wheel into horizontal scroll for mouse users.
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      el.scrollLeft += e.deltaY
    }
  }

  const onHandlePointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft }
  }

  const onHandlePointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current
    if (!el || !drag.current) return
    const { clientWidth, scrollWidth } = el
    const trackRange = clientWidth - handle.width
    if (trackRange <= 0) return
    const dx = e.clientX - drag.current.startX
    const maxScroll = scrollWidth - clientWidth
    el.scrollLeft = drag.current.startScroll + (dx / trackRange) * maxScroll
  }

  const onHandlePointerUp = (e: React.PointerEvent) => {
    drag.current = null
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
  }

  useEffect(() => {
    window.addEventListener('resize', recompute)
    return () => window.removeEventListener('resize', recompute)
  }, [recompute])

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={`hide-scrollbar overflow-x-auto ${className}`}
        onScroll={recompute}
        onWheel={onWheel}
      >
        {children}
      </div>
      {handle.visible && (
        <div className="mt-2 h-1.5 px-4">
          <div className="relative h-full rounded-full bg-neutral-700/60">
            <div
              className="absolute top-0 h-full cursor-grab rounded-full bg-neutral-400 active:cursor-grabbing"
              style={{ width: handle.width, left: handle.left }}
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={onHandlePointerUp}
              data-testid="scrollarea-handle"
            />
          </div>
        </div>
      )}
    </div>
  )
}
