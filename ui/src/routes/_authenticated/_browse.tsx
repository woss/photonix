import { createFileRoute, Outlet } from '@tanstack/react-router'
import { BrowseLayout } from '../../components/BrowseLayout'

export const Route = createFileRoute('/_authenticated/_browse')({
  component: BrowseRoot,
})

/**
 * Persistent chrome for the browse screens. Rendering BrowseLayout here (rather
 * than per-page) keeps the header and tab bar mounted across Timeline/Albums/Map
 * navigation, so the tab highlight slides instead of jumping.
 */
function BrowseRoot() {
  return (
    <BrowseLayout>
      <Outlet />
    </BrowseLayout>
  )
}
