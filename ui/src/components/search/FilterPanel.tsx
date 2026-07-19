import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { RangeSlider } from './RangeSlider'
import { useLibrariesStore } from '../../lib/libraries'
import { useSearchStore } from '../../lib/search/store'
import { GET_FILTER_FACETS } from '../../lib/search/facets-graphql'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { TagItem } from '../../lib/search/graphql'
import type { FilterType } from '../../lib/search/types'

// Swatch colours mirror master's ColorTags.css so named tags (Amber, Turquoise,
// Azure, …) render the exact hue rather than relying on CSS colour keywords.
const COLOR_SWATCH: Record<string, string> = {
  Red: 'rgb(229, 36, 36)',
  Orange: 'rgb(245, 133, 0)',
  Amber: 'rgb(234, 166, 30)',
  Yellow: 'rgb(240, 240, 39)',
  Lime: 'rgb(168, 228, 26)',
  Green: 'rgb(7, 215, 7)',
  Teal: 'rgb(16, 202, 155)',
  Turquoise: 'rgb(25, 225, 225)',
  Aqua: 'rgb(10, 188, 245)',
  Azure: 'rgb(30, 83, 249)',
  Blue: 'rgb(0, 0, 255)',
  Purple: 'rgb(127, 0, 255)',
  Orchid: 'rgb(190, 0, 255)',
  Magenta: 'rgb(233, 8, 200)',
  White: 'rgb(255, 255, 255)',
  Gray: 'rgb(124, 124, 124)',
  Black: 'rgb(0, 0, 0)',
}

const swatchColor = (name: string) =>
  COLOR_SWATCH[name] ?? name.toLowerCase()

// Parse an exposure string like "1/125" or "8" into seconds for sorting.
function exposureSeconds(v: string): number {
  if (v.includes('/')) {
    const [a, b] = v.split('/')
    return Number(a) / Number(b)
  }
  return Number(v)
}

interface NumericFacet {
  key: string
  label: string
  prefix: string
  group: FilterType
  values: (number | string)[]
  format: (v: number | string) => string
  emit: 'range' | 'list'
}

export function FilterPanel() {
  const { activeLibraryId } = useLibrariesStore()
  const { selectedFilters, addFilter, removeFilter, setPrefixFilter } =
    useSearchStore()

  // Narrow tag facets by the currently-selected filters.
  const multiFilter = useMemo(() => {
    const parts = selectedFilters.map((f) => f.id)
    if (activeLibraryId) parts.unshift(`library_id:${activeLibraryId}`)
    return parts.join(' ') || undefined
  }, [selectedFilters, activeLibraryId])

  const { data: freshData, previousData } = useQuery(GET_FILTER_FACETS, {
    variables: { libraryId: activeLibraryId!, multiFilter },
    skip: !activeLibraryId,
    // Refresh on every open so edits made elsewhere (ratings, tags, face
    // renames) are reflected without a reload.
    fetchPolicy: 'cache-and-network',
  })
  // While a narrowed query (changed multiFilter) is in flight, data is
  // undefined — keep the previous facets so the panel doesn't unmount and
  // kill an in-progress slider drag.
  const data = freshData ?? previousData

  const numericFacets = useMemo<NumericFacet[]>(() => {
    if (!data) return []
    const apertures = [...data.allApertures].sort((a, b) => a - b)
    const isos = [...data.allIsoSpeeds].sort((a, b) => a - b)
    const focals = [...data.allFocalLengths].sort((a, b) => a - b)
    const exposures = [...data.allExposures].sort(
      (a, b) => exposureSeconds(a) - exposureSeconds(b)
    )
    // Order mirrors master's FiltersContainer: Aperture, Exposure, ISO Speed,
    // Focal Length, Rating.
    return [
      {
        key: 'aperture',
        label: 'Aperture',
        prefix: 'aperture',
        group: 'Aperture',
        values: apertures,
        format: (v) => `f/${v}`,
        emit: 'range',
      },
      {
        key: 'exposure',
        label: 'Exposure',
        prefix: 'exposure',
        group: 'Exposure',
        values: exposures,
        format: (v) => `${v}s`,
        emit: 'list',
      },
      {
        key: 'isoSpeed',
        label: 'ISO Speed',
        prefix: 'isoSpeed',
        group: 'ISO Speed',
        values: isos,
        format: (v) => `${v}`,
        emit: 'range',
      },
      {
        key: 'focalLength',
        label: 'Focal Length',
        prefix: 'focalLength',
        group: 'Focal Length',
        values: focals,
        format: (v) => `${v}mm`,
        emit: 'range',
      },
      {
        key: 'rating',
        label: 'Rating',
        prefix: 'rating',
        group: 'Rating',
        values: [1, 2, 3, 4, 5],
        format: (v) => '★'.repeat(Number(v)),
        emit: 'range',
      },
    ]
  }, [data])

  // Current [min,max] index of a facet's slider, derived from the active pill.
  const sliderRange = (facet: NumericFacet): [number, number] => {
    const max = facet.values.length - 1
    const active = selectedFilters.find((f) => f.id.startsWith(`${facet.prefix}:`))
    if (!active) return [0, max]
    const raw = active.id.slice(facet.prefix.length + 1)
    if (facet.emit === 'range') {
      const [lo, hi] = raw.split('-')
      const minIdx = facet.values.findIndex((v) => String(v) === lo)
      const maxIdx = facet.values.findIndex((v) => String(v) === hi)
      return [minIdx < 0 ? 0 : minIdx, maxIdx < 0 ? max : maxIdx]
    }
    // list (exposure): first & last selected value
    const parts = raw.split('-')
    const minIdx = facet.values.findIndex((v) => String(v) === parts[0])
    const maxIdx = facet.values.findIndex(
      (v) => String(v) === parts[parts.length - 1]
    )
    return [minIdx < 0 ? 0 : minIdx, maxIdx < 0 ? max : maxIdx]
  }

  const onSliderChange = (facet: NumericFacet, min: number, max: number) => {
    const last = facet.values.length - 1
    // Full range => no filter.
    if (min <= 0 && max >= last) {
      setPrefixFilter(facet.prefix, null)
      return
    }
    let value: string
    let name: string
    if (facet.emit === 'range') {
      value = `${facet.values[min]}-${facet.values[max]}`
      name = `${facet.format(facet.values[min])}–${facet.format(facet.values[max])}`
    } else {
      value = facet.values.slice(min, max + 1).join('-')
      name = `${facet.format(facet.values[min])}–${facet.format(facet.values[max])}`
    }
    setPrefixFilter(facet.prefix, {
      id: `${facet.prefix}:${value}`,
      name,
      group: facet.group,
    })
  }

  // Single-select mode facets (metering / drive / shooting).
  const modeFacets: { label: string; prefix: string; group: FilterType; values: string[] }[] =
    data
      ? [
          { label: 'Metering Mode', prefix: 'meteringMode', group: 'Metering Mode', values: data.allMeteringModes },
          { label: 'Drive Mode', prefix: 'driveMode', group: 'Drive Mode', values: data.allDriveModes },
          { label: 'Shooting Mode', prefix: 'shootingMode', group: 'Shooting Mode', values: data.allShootingModes },
        ]
      : []

  const isActive = (id: string) => selectedFilters.some((f) => f.id === id)

  const toggleTag = (tag: TagItem, group: FilterType) => {
    const id = `tag:${tag.id}`
    if (isActive(id)) removeFilter(id)
    else addFilter({ id, name: tag.name, group })
  }

  const toggleMode = (prefix: string, value: string, group: FilterType) => {
    const id = `${prefix}:${value}`
    const current = selectedFilters.find((f) => f.id.startsWith(`${prefix}:`))
    if (current?.id === id) setPrefixFilter(prefix, null)
    else setPrefixFilter(prefix, { id, name: value, group })
  }

  const setFlash = (on: boolean) => {
    const id = `flash:${on ? 'on' : 'off'}`
    const current = selectedFilters.find((f) => f.id.startsWith('flash:'))
    if (current?.id === id) setPrefixFilter('flash', null)
    else setPrefixFilter('flash', { id, name: on ? 'Flash on' : 'Flash off', group: 'Flash' })
  }

  // Build a two-level location hierarchy (parent → children).
  const locationTree = useMemo(() => {
    const tags = data?.allLocationTags ?? []
    const byId = new Map(tags.map((t) => [t.id, t]))
    const roots: { tag: TagItem; children: TagItem[] }[] = []
    const childrenOf = new Map<string, TagItem[]>()
    for (const t of tags) {
      if (t.parent?.id && byId.has(t.parent.id)) {
        const arr = childrenOf.get(t.parent.id) ?? []
        arr.push(t)
        childrenOf.set(t.parent.id, arr)
      }
    }
    for (const t of tags) {
      if (!t.parent?.id || !byId.has(t.parent.id)) {
        roots.push({ tag: t, children: childrenOf.get(t.id) ?? [] })
      }
    }
    return roots
  }, [data])

  if (!activeLibraryId || !data) return null

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors ${
      active
        ? 'bg-teal-600 text-white'
        : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'
    }`

  const flashOn = isActive('flash:on')
  const flashOff = isActive('flash:off')

  // Each facet renders as a fixed-width column; the panel scrolls horizontally
  // (like master) so it stays short rather than growing tall.
  const colClass = 'flex h-full w-48 shrink-0 flex-col'
  const headClass =
    'mb-2 shrink-0 text-xs font-semibold uppercase tracking-wide text-neutral-400'
  const bodyClass = 'flex flex-wrap content-start gap-2 overflow-y-auto pr-1'

  // A tag-chip facet column (Objects / Styles).
  const tagColumn = (
    testid: string,
    label: string,
    tags: TagItem[],
    group: FilterType
  ) =>
    tags.length > 0 && (
      <div className={colClass} data-testid={testid}>
        <div className={headClass}>{label}</div>
        <div className={bodyClass}>
          {tags.map((tag) => (
            <button
              key={tag.id}
              className={chip(isActive(`tag:${tag.id}`))}
              onClick={() => toggleTag(tag, group)}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div
      className="group/filters rounded-b-lg border-t border-neutral-700 bg-neutral-800"
      data-testid="filter-panel"
    >
      {/* Horizontal strip in a Radix ScrollArea: the native bar is replaced by a
          thin rounded pill that fades in on panel hover (mirrors master). Wheel,
          drag and touch scrolling still work via the native viewport. */}
      <ScrollAreaPrimitive.Root
        type="always"
        className="relative w-full overflow-hidden"
      >
        <ScrollAreaPrimitive.Viewport className="h-52 w-full">
          {/* Order mirrors master's FiltersContainer. */}
          <div className="flex h-full gap-6 px-3 py-4">
          {/* Objects */}
          {tagColumn('facet-objects', 'Objects', data.allObjectTags, 'Objects')}

          {/* Locations (hierarchical) */}
          {locationTree.length > 0 && (
            <div className={`${colClass} w-56`} data-testid="facet-locations">
              <div className={headClass}>Locations</div>
              <ul className="space-y-1 overflow-y-auto pr-1">
                {locationTree.map(({ tag, children }) => (
                  <li key={tag.id}>
                    <button
                      className={`text-sm ${isActive(`tag:${tag.id}`) ? 'text-teal-400' : 'text-neutral-200 hover:text-white'}`}
                      onClick={() => toggleTag(tag, 'Locations')}
                    >
                      {tag.name}
                    </button>
                    {children.length > 0 && (
                      <ul className="ml-4 space-y-1 border-l border-neutral-700 pl-3">
                        {children.map((child) => (
                          <li key={child.id}>
                            <button
                              className={`text-sm ${isActive(`tag:${child.id}`) ? 'text-teal-400' : 'text-neutral-300 hover:text-white'}`}
                              onClick={() => toggleTag(child, 'Locations')}
                            >
                              {child.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Colors — compact swatch grid (7 per row, like master's ColorTags),
              no inner scroll; colour name shown via tooltip on hover. */}
          {data.allColorTags.length > 0 && (
            <div className="flex h-full shrink-0 flex-col" data-testid="facet-colors">
              <div className={headClass}>Colors</div>
              <div className="grid grid-cols-7 content-start gap-1.5">
                {data.allColorTags.map((tag) => {
                  const active = isActive(`tag:${tag.id}`)
                  return (
                    <Tooltip key={tag.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => toggleTag(tag, 'Colors')}
                          aria-label={tag.name}
                          aria-pressed={active}
                          data-testid={`color-swatch-${tag.name}`}
                          className={cn(
                            'h-[25px] w-[25px] rounded border border-white/30 transition-shadow',
                            active &&
                              'ring-2 ring-[#00a8a1] ring-offset-2 ring-offset-neutral-800'
                          )}
                          style={{ backgroundColor: swatchColor(tag.name) }}
                        />
                      </TooltipTrigger>
                      <TooltipContent>{tag.name}</TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          )}

          {/* Styles */}
          {tagColumn('facet-styles', 'Styles', data.allStyleTags, 'Styles')}

          {/* Range sliders — Aperture, Exposure, ISO, Focal Length, Rating */}
          {numericFacets
            .filter((f) => f.values.length > 1)
            .map((facet) => {
              const [min, max] = sliderRange(facet)
              return (
                <div key={facet.key} className={colClass} data-testid={`facet-${facet.key}`}>
                  <div className={headClass}>{facet.label}</div>
                  <RangeSlider
                    count={facet.values.length}
                    minIndex={min}
                    maxIndex={max}
                    onChange={(a, b) => onSliderChange(facet, a, b)}
                    formatValue={(i) => facet.format(facet.values[i])}
                  />
                </div>
              )
            })}

          {/* Flash */}
          <div className={colClass} data-testid="facet-flash">
            <div className={headClass}>Flash</div>
            <div className={bodyClass}>
              <button className={chip(flashOn)} onClick={() => setFlash(true)} data-testid="flash-on">
                On
              </button>
              <button className={chip(flashOff)} onClick={() => setFlash(false)} data-testid="flash-off">
                Off
              </button>
            </div>
          </div>

          {/* Metering / Drive / Shooting modes */}
          {modeFacets
            .filter((m) => m.values.length > 0)
            .map((mode) => (
              <div key={mode.prefix} className={colClass} data-testid={`facet-${mode.prefix}`}>
                <div className={headClass}>{mode.label}</div>
                <div className={bodyClass}>
                  {mode.values.map((v) => (
                    <button
                      key={v}
                      className={chip(isActive(`${mode.prefix}:${v}`))}
                      onClick={() => toggleMode(mode.prefix, v, mode.group)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollAreaPrimitive.Viewport>
        <ScrollAreaPrimitive.Scrollbar
          orientation="horizontal"
          className="flex h-2.5 touch-none flex-col p-px opacity-0 transition-opacity duration-200 select-none group-hover/filters:opacity-100"
        >
          <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-[#666] transition-colors hover:bg-[#888]" />
        </ScrollAreaPrimitive.Scrollbar>
      </ScrollAreaPrimitive.Root>
    </div>
  )
}
