import { createFileRoute } from '@tanstack/react-router'
import { LibrariesPage } from '../../../../components/settings/LibrariesPage'

export const Route = createFileRoute('/_authenticated/settings/libraries/')({
  component: LibrariesPage,
})
