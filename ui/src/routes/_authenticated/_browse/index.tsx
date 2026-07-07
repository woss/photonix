import { createFileRoute } from '@tanstack/react-router'
import { SearchBar } from '../../../components/search'
import { Thumbnails } from '../../../components/thumbnails'

export const Route = createFileRoute('/_authenticated/_browse/')({
  component: TimelinePage,
})

function TimelinePage() {
  return (
    <>
      <SearchBar />
      <main className="flex-grow overflow-auto pb-24">
        <Thumbnails />
      </main>
    </>
  )
}
