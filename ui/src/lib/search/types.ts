export type FilterType =
  | 'Locations'
  | 'Objects'
  | 'People'
  | 'Colors'
  | 'Styles'
  | 'Events'
  | 'Cameras'
  | 'Lenses'
  | 'Generic Tags'
  | 'Aperture'
  | 'Exposure'
  | 'ISO Speed'
  | 'Focal Length'
  | 'Rating'
  | 'Flash'
  | 'Metering Mode'
  | 'Drive Mode'
  | 'Shooting Mode'

export interface SelectedFilter {
  id: string // e.g., "tag:abc-123" or "camera:xyz-456"
  name: string // Display name
  group: FilterType
}

export interface AutocompleteOption {
  id: string
  name: string
  type: FilterType
}

export interface SearchState {
  // Search text (what user is typing)
  searchText: string
  // Selected filters (pills)
  selectedFilters: SelectedFilter[]
  // Actions
  setSearchText: (text: string) => void
  addFilter: (filter: SelectedFilter) => void
  removeFilter: (filterId: string) => void
  // Set (or clear, with null) the single active filter for a `prefix:` facet
  // such as aperture/flash/meteringMode. Replaces any existing filter with the
  // same prefix.
  setPrefixFilter: (prefix: string, filter: SelectedFilter | null) => void
  clearAll: () => void
}
