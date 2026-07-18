import { createFileRoute } from '@tanstack/react-router'
import { AlbumGrid } from '../../../../components/albums/AlbumGrid'
import { SearchBar } from '../../../../components/search'

export const Route = createFileRoute('/_authenticated/_browse/albums/')({
  component: AlbumsPage,
})

function AlbumsPage() {
  return (
    <>
      <SearchBar />
      <AlbumGrid />
    </>
  )
}
