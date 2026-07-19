import { Link } from '@tanstack/react-router'
import { Menu, Library, Settings, LogOut } from 'lucide-react'
import Logo from '../../assets/logo.svg'
import { useLayoutStore } from '../../lib/mobile-app'
import { Notifications } from '../notifications/Notifications'
import { Avatar } from '../ui/Avatar'
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
  avatarUrl?: string | null
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
  const isMobileApp = useLayoutStore((s) => s.isMobileApp)
  const safeAreaTop = useLayoutStore((s) => s.safeAreaTop)

  const isActiveLibrary = (id: string) => activeLibraryId === id

  return (
    <header
      className="flex items-center justify-between bg-[#444] z-20 flex-none"
      style={{ height: 50 + safeAreaTop, paddingTop: safeAreaTop }}
    >
      {/* Logo and brand */}
      <div className="flex items-center mx-3 text-white">
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
        {/* Spectral halo behind the mark: the brand strip colours as soft
            light, replacing the old white glow */}
        <span className="relative flex-none w-[30px] h-[30px] mr-[11px] before:content-[''] before:absolute before:-inset-[5px] before:rounded-full before:bg-[conic-gradient(from_210deg,var(--brand-1),var(--brand-2),var(--brand-3),var(--brand-4),var(--brand-5),var(--brand-1))] before:blur-[7px] before:opacity-[0.85]">
          <img
            src={Logo}
            alt="Photonix Logo"
            className="relative w-full h-full rounded-full"
          />
        </span>
        <span className="text-[26px] font-normal leading-tight">Photonix</span>
      </div>

      {/* Navigation spacer */}
      <div className="flex-grow" />

      {/* Background-task progress bell */}
      <Notifications />

      {/* User menu — the avatar is the trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2.5 mr-0.5 cursor-pointer rounded-full hover:bg-white/10 transition-colors outline-none"
            aria-label="Open menu"
            data-testid="header-menu-button"
          >
            <Avatar
              username={profile?.username ?? '?'}
              avatarUrl={profile?.avatarUrl}
              size={30}
              data-testid="header-avatar"
            />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={0}
          className="w-[220px] rounded-none border-0 bg-[#444] p-0 text-neutral-300 shadow-[-3px_8px_17px_rgba(0,0,0,0.15)]"
        >
          {/* Profile section */}
          {profile && (
            <DropdownMenuLabel className="flex items-center px-4 py-3 font-normal">
              <Avatar
                username={profile.username}
                avatarUrl={profile.avatarUrl}
                size={28}
                className="mr-2.5"
              />
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

          {/* Settings (account management lives inside the settings area) */}
          <DropdownMenuItem asChild className={MENU_ITEM_CLASS}>
            <Link to="/settings" data-testid="settings-menu-item">
              <Settings className="w-6 h-6 mr-2.5 text-white/90" />
              <span className="text-sm">Settings</span>
            </Link>
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
