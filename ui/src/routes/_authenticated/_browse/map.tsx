import { useMemo } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@apollo/client/react'
import { MapView, type MapMarkerPhoto } from '../../../components/map/MapView'
import { GET_MAP_PHOTOS } from '../../../lib/map/graphql'
import { useLibrariesStore } from '../../../lib/libraries'
import { usePhotoFilters } from '../../../lib/search'

export const Route = createFileRoute('/_authenticated/_browse/map')({
  component: MapPage,
})

function MapPage() {
  const navigate = useNavigate()
  const { activeLibraryId } = useLibrariesStore()
  const filters = usePhotoFilters()

  const { data } = useQuery(GET_MAP_PHOTOS, {
    variables: { filters },
    skip: !filters.includes('library_id:'),
  })

  const photos = useMemo<MapMarkerPhoto[]>(
    () =>
      (data?.mapPhotos?.edges ?? [])
        .map((e) => e.node)
        .filter((n): n is typeof n & { location: [number, number] } =>
          Array.isArray(n.location)
        )
        .map((n) => ({ id: n.id, location: n.location, rotation: n.rotation })),
    [data]
  )

  if (!activeLibraryId) {
    return (
      <main className="flex-grow overflow-hidden p-10 text-neutral-400">
        Select a library to view the map.
      </main>
    )
  }

  return (
    <main className="relative flex-grow overflow-hidden" data-testid="map-page">
      <MapView
        photos={photos}
        onMarkerClick={(id) =>
          navigate({ to: '/photo/$id', params: { id } })
        }
      />
    </main>
  )
}
