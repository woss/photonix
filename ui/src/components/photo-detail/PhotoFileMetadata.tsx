import { useQuery } from '@apollo/client/react'
import { GET_PHOTO_FILE_METADATA } from '../../lib/photos/detail-graphql'

interface PhotoFileMetadataProps {
  photoFileId: string
}

/**
 * Full EXIF dump for a photo file — every key/value returned by exiftool
 * on the backend (`photoFileMetadata`). Lazily mounted from the sidebar's
 * "Show all" toggle so the query only fires when expanded.
 */
export function PhotoFileMetadata({ photoFileId }: PhotoFileMetadataProps) {
  const { data, loading } = useQuery(GET_PHOTO_FILE_METADATA, {
    variables: { photoFileId },
    fetchPolicy: 'cache-first',
  })

  if (loading) {
    return <div className="text-white/40 py-2">Loading metadata…</div>
  }

  const result = data?.photoFileMetadata
  if (!result?.ok || !result.data) {
    return <div className="text-white/40 py-2">Something went wrong!</div>
  }

  const entries = Object.entries(result.data)

  return (
    <ul
      className="mt-2 max-h-[400px] overflow-y-auto space-y-1 border-t border-white/10 pt-2"
      data-testid="full-exif-list"
    >
      {entries.map(([key, value]) => (
        <li key={key} className="break-words">
          <span className="text-white/50">{key}:</span> {String(value)}
        </li>
      ))}
    </ul>
  )
}
