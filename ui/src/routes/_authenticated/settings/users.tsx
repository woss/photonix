import { createFileRoute } from '@tanstack/react-router'
import { UsersPage } from '../../../components/settings/UsersPage'

// Staff-only in practice: the sidebar hides the link for non-staff and the
// allUsers query / admin mutations are enforced server-side, so a direct URL
// visit by a non-admin just renders the "Only site admins" notice.
export const Route = createFileRoute('/_authenticated/settings/users')({
  component: UsersPage,
})
