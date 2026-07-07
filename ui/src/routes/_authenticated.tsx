import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { ModalRoot } from '../components/ModalRoot'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    if (context.auth.isLoading) return
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: '/login',
        search: { next: location.href },
      })
    }
  },
  component: () => (
    <>
      <Outlet />
      <ModalRoot />
    </>
  ),
})
