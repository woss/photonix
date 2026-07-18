import { Link } from '@tanstack/react-router'
import {
  Menu,
  MoreVertical,
  CircleUser,
  Library,
  Settings,
  KeyRound,
  LogOut,
} from 'lucide-react'
import Logo from '../../assets/logo.svg'
import { useUIStore } from '../../lib/ui/store'
import { useLayoutStore } from '../../lib/mobile-app'
import { Notifications } from '../notifications/Notifications'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

interface UserProfile {
  username: string
  email: string
}

interface LibraryItem {
  id: string
  name: string
}

interface HeaderProps {
  profile?: UserProfile | null
  libraries?: LibraryItem[]
  activeLibraryId?: string | null
  onLibraryChange?: (library: LibraryItem) => void
}

const MENU_ITEM_CLASS =
  'flex items-center px-4 py-3 cursor-pointer rounded-none text-neutral-300 focus:bg-white/10 focus:text-white data-[highlighted]:bg-white/10 data-[highlighted]:text-white transition-colors'

export function Header({
  profile,
  libraries,
  activeLibraryId,
  onLibraryChange,
}: HeaderProps) {
  const openModal = useUIStore((s) => s.openModal)
  const isMobileApp = useLayoutStore((s) => s.isMobileApp)
  const safeAreaTop = useLayoutStore((s) => s.safeAreaTop)

  const isActiveLibrary = (id: string) => activeLibraryId === id

  // Open an app modal after the menu has finished closing. Deferring avoids a
  // focus/pointer-events race between the closing Radix menu and the opening
  // Radix dialog.
  const openModalDeferred = (modal: 'account' | 'settings') => {
    setTimeout(() => openModal(modal), 0)
  }

  return (
    <header
      className="flex items-center justify-between bg-[#444] z-20 flex-none"
      style={{ height: 50 + safeAreaTop, paddingTop: safeAreaTop }}
    >
      {/* Logo and brand */}
      <div className="flex items-center mx-2.5 text-white">
        {/* Inside the native mobile app, a hamburger opens the app's drawer */}
        {isMobileApp && (
          <button
            onClick={() => window.photonix?.openAppMenu?.()}
            className="p-1 mr-2 cursor-pointer"
            aria-label="Open app menu"
            data-testid="app-menu-button"
          >
            <Menu className="w-[26px] h-[26px] text-white/90" />
          </button>
        )}
        <img
          src={Logo}
          alt="Photonix Logo"
          className="w-[30px] h-[30px] mr-2 rounded-full shadow-[0_0_6px_rgba(255,255,255,0.5)]"
        />
        <span className="text-[26px] font-normal leading-tight">Photonix</span>
      </div>

      {/* Navigation spacer */}
      <div className="flex-grow" />

      {/* Background-task progress bell */}
      <Notifications />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2.5 cursor-pointer hover:bg-white/10 transition-colors outline-none"
            aria-label="Open menu"
            data-testid="header-menu-button"
          >
            <MoreVertical className="w-[30px] h-[30px] text-white/90" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={0}
          className="w-[200px] rounded-none border-0 bg-[#444] p-0 text-neutral-300 shadow-[-3px_8px_17px_rgba(0,0,0,0.15)]"
        >
          {/* Profile section */}
          {profile && (
            <DropdownMenuLabel className="flex items-center px-4 py-3 font-normal">
              <CircleUser className="w-6 h-6 mr-2.5 text-white/90" />
              <div className="flex flex-col min-w-0">
                <span
                  className="font-semibold text-sm leading-[18px] truncate"
                  data-testid="logged-in-user"
                >
                  {profile.username}
                </span>
                {profile.email && (
                  <span className="text-[10px] leading-3 text-neutral-400 truncate">
                    {profile.email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
          )}

          {/* Libraries */}
          {libraries?.map((lib) => (
            <DropdownMenuItem
              key={lib.id}
              onSelect={() => onLibraryChange?.(lib)}
              className={MENU_ITEM_CLASS}
              data-testid={`library-item-${lib.id}`}
            >
              <Library className="w-6 h-6 mr-2.5 text-white/90" />
              <span
                className="flex-1 text-sm"
                data-testid={`library-name-${lib.id}`}
              >
                {lib.name}
              </span>
              {isActiveLibrary(lib.id) ? (
                <span
                  className="w-2.5 h-2.5 bg-teal-500 rounded-full"
                  data-testid={`library-active-indicator-${lib.id}`}
                />
              ) : (
                <span className="w-2.5" />
              )}
            </DropdownMenuItem>
          ))}

          {/* Account */}
          <DropdownMenuItem
            onSelect={() => openModalDeferred('account')}
            className={MENU_ITEM_CLASS}
            data-testid="account-menu-item"
          >
            <KeyRound className="w-6 h-6 mr-2.5 text-white/90" />
            <span className="text-sm">Account</span>
          </DropdownMenuItem>

          {/* Settings */}
          <DropdownMenuItem
            onSelect={() => openModalDeferred('settings')}
            className={MENU_ITEM_CLASS}
            data-testid="settings-menu-item"
          >
            <Settings className="w-6 h-6 mr-2.5 text-white/90" />
            <span className="text-sm">Settings</span>
          </DropdownMenuItem>

          {/* Logout */}
          <DropdownMenuItem asChild className={MENU_ITEM_CLASS}>
            <Link to="/logout" data-testid="logout-link">
              <LogOut className="w-6 h-6 mr-2.5 text-white/90" />
              <span className="text-sm">Logout</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}

export default Header
