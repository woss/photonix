import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/_browse/map')({
  component: MapPage,
})

function MapPage() {
  return <main className="flex-grow overflow-hidden text-neutral-400">Map</main>
}
