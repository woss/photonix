import { useEffect, useMemo } from 'react'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import L from 'leaflet'
import 'leaflet.markercluster'
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

// On-brand cluster bubble: dark circle, teal ring, white count — echoing the
// white-ringed photo markers rather than master's plain green bubble.
function clusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count < 10 ? 40 : count < 100 ? 48 : 56
  return L.divIcon({
    className: 'leaflet-photo-cluster',
    iconSize: [size, size],
    html: `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:rgba(29,29,29,0.9);border:3px solid #00A8A1;box-shadow:0 0 0 1px rgba(255,255,255,0.35),0 2px 6px rgba(0,0,0,0.5);color:#fff;font-weight:600;font-size:${count < 100 ? 14 : 12}px">${count}</div>`,
  })
}

// Renders the geotagged photo markers inside a leaflet.markercluster group so
// overlapping thumbnails collapse into a count bubble that zooms-to-bounds on
// click. Manual integration (rather than react-leaflet-cluster, which is not
// react-leaflet v5 compatible) via the raw leaflet plugin + useMap().
function ClusteredMarkers({
  photos,
  onMarkerClick,
}: {
  photos: MapMarkerPhoto[]
  onMarkerClick?: (photoId: string) => void
}) {
  const map = useMap()

  useEffect(() => {
    const group = L.markerClusterGroup({
      iconCreateFunction: clusterIcon,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    })

    for (const photo of photos) {
      const marker = L.marker(photo.location, { icon: photoIcon(photo) })
      marker.on('click', () => onMarkerClick?.(photo.id))
      group.addLayer(marker)
    }

    map.addLayer(group)
    return () => {
      map.removeLayer(group)
    }
  }, [map, photos, onMarkerClick])

  return null
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
      className={`isolate h-full w-full ${className}`}
      data-testid="map-container"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />

      {isMiniMap && location && <Marker position={location} icon={pinIcon} />}

      {!isMiniMap && photos && (
        <ClusteredMarkers photos={photos} onMarkerClick={onMarkerClick} />
      )}

      {!isMiniMap && (
        <>
          <MapStatePersistence />
          {photos && <FitBounds photos={photos} />}
        </>
      )}
    </MapContainer>
  )
}
