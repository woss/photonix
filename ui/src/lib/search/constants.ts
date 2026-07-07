import {
  MapPin,
  Tag,
  User,
  Palette,
  Sparkles,
  Calendar,
  Camera,
  Aperture,
  Timer,
  Film,
  Focus,
  Star,
  Zap,
  Gauge,
  Layers,
  Crosshair,
  type LucideIcon,
} from 'lucide-react'
import type { FilterType } from './types'

export const FILTER_TYPE_ICONS: Record<FilterType, LucideIcon> = {
  Locations: MapPin,
  Objects: Tag,
  People: User,
  Colors: Palette,
  Styles: Sparkles,
  Events: Calendar,
  Cameras: Camera,
  Lenses: Camera,
  'Generic Tags': Tag,
  Aperture: Aperture,
  Exposure: Timer,
  'ISO Speed': Film,
  'Focal Length': Focus,
  Rating: Star,
  Flash: Zap,
  'Metering Mode': Gauge,
  'Drive Mode': Layers,
  'Shooting Mode': Crosshair,
}

// Keyboard key names (using modern key values)
export const KEYS = {
  BACKSPACE: 'Backspace',
  TAB: 'Tab',
  ENTER: 'Enter',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
} as const
