import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_browse/albums')({
  component: AlbumsPage,
})

function AlbumsPage() {
  return (
    <main className="flex-grow overflow-auto p-10 pb-24 text-neutral-400">
      Albums
    </main>
  )
}
