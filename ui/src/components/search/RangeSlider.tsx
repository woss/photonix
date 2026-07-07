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
 */
export function RangeSlider({
  count,
  minIndex,
  maxIndex,
  onChange,
  formatValue,
}: RangeSliderProps) {
  const max = Math.max(0, count - 1)
  const leftPct = max > 0 ? (minIndex / max) * 100 : 0
  const rightPct = max > 0 ? (maxIndex / max) * 100 : 100

  return (
    <div className="px-1">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span data-testid="range-min">{formatValue(minIndex)}</span>
        <span data-testid="range-max">{formatValue(maxIndex)}</span>
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
          value={minIndex}
          onChange={(e) =>
            onChange(Math.min(Number(e.target.value), maxIndex), maxIndex)
          }
          aria-label="Minimum"
        />
        <input
          type="range"
          className="dual-range top-1/2"
          min={0}
          max={max}
          step={1}
          value={maxIndex}
          onChange={(e) =>
            onChange(minIndex, Math.max(Number(e.target.value), minIndex))
          }
          aria-label="Maximum"
        />
      </div>
    </div>
  )
}
