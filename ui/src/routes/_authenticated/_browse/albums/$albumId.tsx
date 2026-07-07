import { createFileRoute, useRouter, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Thumbnails } from '../../../../components/thumbnails'

interface AlbumDetailSearch {
  name?: string
}

export const Route = createFileRoute(
  '/_authenticated/_browse/albums/$albumId'
)({
  validateSearch: (search: Record<string, unknown>): AlbumDetailSearch => ({
    name: typeof search.name === 'string' ? search.name : undefined,
  }),
  component: AlbumDetailPage,
})

function AlbumDetailPage() {
  const { albumId } = Route.useParams()
  const { name } = Route.useSearch()
  const router = useRouter()
  const navigate = useNavigate()

  const goBack = () => {
    if (router.history.length > 1) {
      router.history.back()
    } else {
      navigate({ to: '/albums' })
    }
  }

  return (
    <>
      <div className="flex items-center gap-3 px-5 py-3">
        <button
          onClick={goBack}
          className="rounded p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="Back to albums"
          data-testid="album-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-medium text-white" data-testid="album-title">
          {name ?? 'Album'}
        </h1>
      </div>
      <main className="flex-grow overflow-auto pb-24">
        <Thumbnails albumId={albumId} />
      </main>
    </>
  )
}
