import { createFileRoute } from '@tanstack/react-router'
import { LibraryDetailPage } from '../../../../components/settings/LibraryDetailPage'

export const Route = createFileRoute(
  '/_authenticated/settings/libraries/$libraryId'
)({
  component: LibraryDetailRoute,
})

function LibraryDetailRoute() {
  const { libraryId } = Route.useParams()
  return <LibraryDetailPage key={libraryId} libraryId={libraryId} />
}
