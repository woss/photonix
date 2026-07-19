import { useState } from 'react'

interface RangeSliderProps {
  count: number
  minIndex: number
  maxIndex: number
  onChange: (minIndex: number, maxIndex: number) => void
  formatValue: (index: number) => string
}

/**
 * Two-handle range slider over an index domain [0, count-1]. The caller maps
 * indices back to the actual (unevenly-spaced) facet values.
 *
 * Values are held locally while the user is interacting and only committed on
 * release — committing per drag-step re-runs the facets query and re-renders
 * the panel mid-drag, which breaks the native range-input drag.
 */
export function RangeSlider({
  count,
  minIndex,
  maxIndex,
  onChange,
  formatValue,
}: RangeSliderProps) {
  const [drag, setDrag] = useState<[number, number] | null>(null)
  const [lo, hi] = drag ?? [minIndex, maxIndex]
  const max = Math.max(0, count - 1)
  const leftPct = max > 0 ? (lo / max) * 100 : 0
  const rightPct = max > 0 ? (hi / max) * 100 : 100

  const commit = () => {
    if (drag) {
      onChange(drag[0], drag[1])
      setDrag(null)
    }
  }

  return (
    <div className="px-1">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span data-testid="range-min">{formatValue(lo)}</span>
        <span data-testid="range-max">{formatValue(hi)}</span>
      </div>
      <div className="relative h-4">
        {/* Track */}
        <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-neutral-700" />
        {/* Selected range */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-teal-500"
          style={{ left: `${leftPct}%`, right: `${100 - rightPct}%` }}
        />
        <input
          type="range"
          className="dual-range top-1/2"
          min={0}
          max={max}
          step={1}
          value={lo}
          onChange={(e) => setDrag([Math.min(Number(e.target.value), hi), hi])}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          aria-label="Minimum"
        />
        <input
          type="range"
          className="dual-range top-1/2"
          min={0}
          max={max}
          step={1}
          value={hi}
          onChange={(e) => setDrag([lo, Math.max(Number(e.target.value), lo)])}
          onPointerUp={commit}
          onKeyUp={commit}
          onBlur={commit}
          aria-label="Maximum"
        />
      </div>
    </div>
  )
}
