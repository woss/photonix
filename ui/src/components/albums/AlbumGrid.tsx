import { useMemo } from 'react'
import { useQuery } from '@apollo/client/react'
import { Link } from '@tanstack/react-router'
import { useLibrariesStore } from '../../lib/libraries'
import { GET_ALBUMS } from '../../lib/albums/graphql'

export function AlbumGrid() {
  const { activeLibraryId } = useLibrariesStore()

  const { data, loading } = useQuery(GET_ALBUMS, {
    variables: { libraryId: activeLibraryId!, first: 100 },
    skip: !activeLibraryId,
  })

  // Only albums with a cover image can be shown as a card.
  const albums = useMemo(
    () =>
      (data?.albumList?.edges ?? [])
        .map((e) => e.node)
        .filter((a) => a.coverImage),
    [data]
  )

  if (!activeLibraryId) {
    return (
      <main className="flex-grow overflow-auto p-10 pb-24 text-neutral-400">
        Select a library to view albums.
      </main>
    )
  }

  if (!loading && albums.length === 0) {
    return (
      <main
        className="flex-grow overflow-auto p-10 pb-24 text-neutral-400"
        data-testid="albums-empty"
      >
        No albums yet. Select photos on the Timeline and use “+ Album” to create
        one.
      </main>
    )
  }

  return (
    <main className="flex-grow overflow-auto pb-24">
      <ul
        className="m-0 p-10 grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-5 max-md:p-5 max-md:grid-cols-[repeat(auto-fill,minmax(100px,1fr))] max-sm:p-2.5 max-sm:grid-cols-[repeat(auto-fill,minmax(90px,1fr))] max-sm:gap-2.5"
        data-testid="albums-grid"
      >
        {albums.map((album) => (
          <li key={album.id}>
            <Link
              to="/albums/$albumId"
              params={{ albumId: album.id }}
              search={{ name: album.name }}
              className="group relative block aspect-square overflow-hidden rounded-[10px] bg-[#292929]"
              data-testid={`album-card-${album.id}`}
            >
              {album.coverImage && (
                <img
                  src={`/thumbnailer/photo/256x256_cover_q50/${album.coverImage.id}/`}
                  alt={album.name}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  style={{
                    transform: `rotate(${album.coverImage.rotation ?? 0}deg)`,
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/60 to-transparent p-2">
                <span className="block truncate text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                  {album.name}
                </span>
              </div>
              <div className="pointer-events-none absolute bottom-1 right-2 text-xs text-white/80 [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                {album.photosCount}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
