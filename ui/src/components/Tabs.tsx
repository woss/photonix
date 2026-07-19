import { Link, useRouterState } from '@tanstack/react-router'
import { Clock, Images, Map } from 'lucide-react'
import { useSearchStore } from '../lib/search/store'

const TABS = [
  { to: '/', label: 'Timeline', icon: Clock },
  { to: '/albums', label: 'Albums', icon: Images },
  { to: '/map', label: 'Map', icon: Map },
] as const

/**
 * Bottom pill tab bar (Timeline / Albums / Map) with a sliding highlight
 * behind the active tab. Route-driven — the active tab follows the pathname.
 */
export function Tabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const clearAll = useSearchStore((s) => s.clearAll)

  const activeIndex = Math.max(
    0,
    TABS.findIndex((t) =>
      t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)
    )
  )

  return (
    <nav
      className="fixed bottom-5 left-5 right-5 z-10 mx-auto max-w-md sm:max-w-lg"
      data-testid="tabs-bar"
    >
      <div className="relative flex h-11 overflow-hidden rounded-full bg-[rgba(50,50,50,0.9)] shadow-[0_4px_8px_1px_rgba(0,0,0,0.3)]">
        {/* Sliding highlight */}
        <div
          className="absolute inset-y-0 rounded-full bg-[#ddd] transition-[left] duration-200 ease-in-out"
          style={{
            width: `${100 / TABS.length}%`,
            left: `${(100 / TABS.length) * activeIndex}%`,
          }}
        />
        {TABS.map((tab, i) => {
          const Icon = tab.icon
          const isActive = i === activeIndex
          return (
            <Link
              key={tab.to}
              to={tab.to}
              onClick={() => clearAll()}
              className={`relative z-10 flex flex-1 items-center justify-center gap-2 text-sm font-medium transition-colors ${
                isActive ? 'text-[#1d1d1d]' : 'text-[#ddd] hover:text-white'
              }`}
              data-testid={`tab-${tab.label.toLowerCase()}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
