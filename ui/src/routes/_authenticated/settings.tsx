import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SettingsShell } from '../../components/settings/SettingsShell'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsRoot,
})

/** Full-screen settings area: inherits the auth guard from `_authenticated`
 * but sits outside the `_browse` chrome (like the photo detail view). */
function SettingsRoot() {
  return (
    <SettingsShell>
      <Outlet />
    </SettingsShell>
  )
}
