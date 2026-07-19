import { createFileRoute } from '@tanstack/react-router'
import { AccountPage } from '../../../components/settings/AccountPage'

export const Route = createFileRoute('/_authenticated/settings/account')({
  component: AccountPage,
})
