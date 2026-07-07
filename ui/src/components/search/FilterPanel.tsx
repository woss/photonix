import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { RangeSlider } from './RangeSlider'
import { useLibrariesStore } from '../../lib/libraries'
import { useSearchStore } from '../../lib/search/store'
import { GET_FILTER_FACETS } from '../../lib/search/facets-graphql'
import type { TagItem } from '../../lib/search/graphql'
import type { FilterType } from '../../lib/search/types'

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

  const { data } = useQuery(GET_FILTER_FACETS, {
    variables: { libraryId: activeLibraryId!, multiFilter },
    skip: !activeLibraryId,
  })

  const numericFacets = useMemo<NumericFacet[]>(() => {
    if (!data) return []
    const apertures = [...data.allApertures].sort((a, b) => a - b)
    const isos = [...data.allIsoSpeeds].sort((a, b) => a - b)
    const focals = [...data.allFocalLengths].sort((a, b) => a - b)
    const exposures = [...data.allExposures].sort(
      (a, b) => exposureSeconds(a) - exposureSeconds(b)
    )
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
        key: 'exposure',
        label: 'Exposure',
        prefix: 'exposure',
        group: 'Exposure',
        values: exposures,
        format: (v) => `${v}s`,
        emit: 'list',
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

  return (
    <div
      className="max-h-[60vh] overflow-y-auto border-t border-neutral-700 bg-neutral-800 p-4"
      data-testid="filter-panel"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Range sliders */}
        <div className="space-y-5">
          {numericFacets
            .filter((f) => f.values.length > 1)
            .map((facet) => {
              const [min, max] = sliderRange(facet)
              return (
                <div key={facet.key} data-testid={`facet-${facet.key}`}>
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                    {facet.label}
                  </div>
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
          <div data-testid="facet-flash">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Flash
            </div>
            <div className="flex gap-2">
              <button className={chip(flashOn)} onClick={() => setFlash(true)} data-testid="flash-on">
                On
              </button>
              <button className={chip(flashOff)} onClick={() => setFlash(false)} data-testid="flash-off">
                Off
              </button>
            </div>
          </div>

          {/* Mode facets */}
          {modeFacets
            .filter((m) => m.values.length > 0)
            .map((mode) => (
              <div key={mode.prefix} data-testid={`facet-${mode.prefix}`}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {mode.label}
                </div>
                <div className="flex flex-wrap gap-2">
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

        {/* Tag facets */}
        <div className="space-y-5">
          {data.allColorTags.length > 0 && (
            <div data-testid="facet-colors">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Colors
              </div>
              <div className="flex flex-wrap gap-2">
                {data.allColorTags.map((tag) => {
                  const active = isActive(`tag:${tag.id}`)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag, 'Colors')}
                      className={`flex items-center gap-1.5 rounded-full py-1 pl-1.5 pr-3 text-sm ${
                        active ? 'bg-teal-600 text-white' : 'bg-neutral-700 text-neutral-200 hover:bg-neutral-600'
                      }`}
                    >
                      <span
                        className="h-4 w-4 rounded-full border border-white/40"
                        style={{ backgroundColor: tag.name.toLowerCase() }}
                      />
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {data.allObjectTags.length > 0 && (
            <div data-testid="facet-objects">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Objects
              </div>
              <div className="flex flex-wrap gap-2">
                {data.allObjectTags.map((tag) => (
                  <button
                    key={tag.id}
                    className={chip(isActive(`tag:${tag.id}`))}
                    onClick={() => toggleTag(tag, 'Objects')}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {data.allStyleTags.length > 0 && (
            <div data-testid="facet-styles">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Styles
              </div>
              <div className="flex flex-wrap gap-2">
                {data.allStyleTags.map((tag) => (
                  <button
                    key={tag.id}
                    className={chip(isActive(`tag:${tag.id}`))}
                    onClick={() => toggleTag(tag, 'Styles')}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {locationTree.length > 0 && (
            <div data-testid="facet-locations">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Locations
              </div>
              <ul className="space-y-1">
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
        </div>
      </div>
    </div>
  )
}
