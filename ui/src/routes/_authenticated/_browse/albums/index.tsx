import { createFileRoute } from '@tanstack/react-router'
import { AlbumGrid } from '../../../../components/albums/AlbumGrid'

export const Route = createFileRoute('/_authenticated/_browse/albums/')({
  component: AlbumsPage,
})

function AlbumsPage() {
  return <AlbumGrid />
}
