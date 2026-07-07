import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'

export interface MapMarkerPhoto {
  id: string
  location: [number, number]
  rotation: number | null
}

interface MapViewProps {
  // Marker mode: a set of geotagged photos rendered as circular thumbnails.
  photos?: MapMarkerPhoto[]
  onMarkerClick?: (photoId: string) => void
  // Mini-map mode: a single location marker (used in the photo detail sidebar).
  location?: [number, number]
  zoom?: number
  hideAttribution?: boolean
  className?: string
}

const LS_ZOOM = 'mapZoom'
const LS_LAT = 'lat'
const LS_LNG = 'lng'

function photoIcon(photo: MapMarkerPhoto): L.DivIcon {
  return L.divIcon({
    className: 'leaflet-photo-icon',
    iconSize: [50, 50],
    html: `<img src="/thumbnailer/photo/256x256_cover_q50/${photo.id}/" style="width:100%;height:100%;object-fit:cover;transform:rotate(${photo.rotation ?? 0}deg)" />`,
  })
}

// Simple circular pin for the single-location mini-map (avoids Leaflet's
// default icon, whose bundled image paths break under Vite).
const pinIcon = L.divIcon({
  className: 'leaflet-pin-icon',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  html: '<span></span>',
})

// Persists zoom/center to localStorage and restores it on mount (full-map mode).
function MapStatePersistence() {
  const map = useMap()

  useEffect(() => {
    const zoom = localStorage.getItem(LS_ZOOM)
    const lat = localStorage.getItem(LS_LAT)
    const lng = localStorage.getItem(LS_LNG)
    if (zoom && lat && lng) {
      map.setView([parseFloat(lat), parseFloat(lng)], parseInt(zoom, 10))
    }
  }, [map])

  useMapEvents({
    zoomend: () => {
      localStorage.setItem(LS_ZOOM, String(map.getZoom()))
      localStorage.setItem(LS_LAT, String(map.getCenter().lat))
      localStorage.setItem(LS_LNG, String(map.getCenter().lng))
    },
    dragend: () => {
      localStorage.setItem(LS_LAT, String(map.getCenter().lat))
      localStorage.setItem(LS_LNG, String(map.getCenter().lng))
    },
  })

  return null
}

// Fits the map to the marker bounds once, unless a persisted view exists.
function FitBounds({ photos }: { photos: MapMarkerPhoto[] }) {
  const map = useMap()
  useEffect(() => {
    if (localStorage.getItem(LS_LAT)) return
    if (photos.length === 0) return
    const bounds = L.latLngBounds(photos.map((p) => p.location))
    map.fitBounds(bounds, { padding: [80, 80], maxZoom: 15 })
  }, [map, photos])
  return null
}

export function MapView({
  photos,
  onMarkerClick,
  location,
  zoom,
  hideAttribution = false,
  className = '',
}: MapViewProps) {
  const isMiniMap = !!location

  const center = useMemo<[number, number]>(() => {
    if (location) return location
    if (photos && photos.length > 0) return photos[0].location
    return [30, 0]
  }, [location, photos])

  return (
    <MapContainer
      center={center}
      zoom={zoom ?? (isMiniMap ? 6 : 2)}
      scrollWheelZoom={!isMiniMap}
      dragging={!isMiniMap}
      attributionControl={!hideAttribution}
      className={`h-full w-full ${className}`}
      data-testid="map-container"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {isMiniMap && location && <Marker position={location} icon={pinIcon} />}

      {!isMiniMap &&
        photos?.map((photo) => (
          <Marker
            key={photo.id}
            position={photo.location}
            icon={photoIcon(photo)}
            eventHandlers={{ click: () => onMarkerClick?.(photo.id) }}
          />
        ))}

      {!isMiniMap && (
        <>
          <MapStatePersistence />
          {photos && <FitBounds photos={photos} />}
        </>
      )}
    </MapContainer>
  )
}
