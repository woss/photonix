import type { ReactNode } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { ArrowLeft, KeyRound, Library, Users } from 'lucide-react'
import { useQuery } from '@apollo/client/react'
import { GET_PROFILE } from '../../lib/auth/graphql'

interface SettingsShellProps {
  children: ReactNode
}

const NAV_LINK_CLASS =
  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors'
const NAV_LINK_ACTIVE_CLASS = 'bg-white/10 text-white'

/**
 * Full-page chrome for the settings area: top bar with a back-to-app control,
 * section nav (sidebar on desktop, horizontal strip on mobile) and content.
 */
export function SettingsShell({ children }: SettingsShellProps) {
  const router = useRouter()
  const { data: profileData } = useQuery(GET_PROFILE)
  const isStaff = !!profileData?.profile?.isStaff

  // Always exits the settings area (in-section navigation has the sidebar;
  // the browser back button still walks history normally).
  const goBack = () => {
    router.navigate({ to: '/' })
  }

  const navItems = [
    { to: '/settings/account', label: 'Account', icon: KeyRound, testId: 'settings-nav-account' },
    ...(isStaff
      ? [{ to: '/settings/users', label: 'Users', icon: Users, testId: 'settings-nav-users' }]
      : []),
    { to: '/settings/libraries', label: 'Libraries', icon: Library, testId: 'settings-nav-libraries' },
  ]

  return (
    <div className="flex h-dvh flex-col bg-[#1d1d1d] text-neutral-200">
      <header className="flex flex-none items-center gap-3 bg-[#444] px-3 h-[50px]">
        <button
          onClick={goBack}
          className="p-1.5 rounded-md cursor-pointer hover:bg-white/10 transition-colors"
          aria-label="Back to photos"
          data-testid="settings-back-button"
        >
          <ArrowLeft className="w-6 h-6 text-white/90" />
        </button>
        <h1 className="text-lg font-semibold text-white">Settings</h1>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden sm:flex-row">
        <nav
          className="flex flex-none gap-1 overflow-x-auto border-b border-white/10 p-2 sm:w-52 sm:flex-col sm:border-b-0 sm:border-r sm:p-3"
          data-testid="settings-nav"
        >
          {navItems.map(({ to, label, icon: Icon, testId }) => (
            <Link
              key={to}
              to={to}
              className={NAV_LINK_CLASS}
              activeProps={{ className: `${NAV_LINK_CLASS} ${NAV_LINK_ACTIVE_CLASS}` }}
              data-testid={testId}
            >
              <Icon className="w-4.5 h-4.5" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="mx-auto w-full max-w-2xl space-y-6 pb-12">{children}</div>
        </main>
      </div>
    </div>
  )
}
