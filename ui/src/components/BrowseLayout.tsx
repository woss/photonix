import { useEffect, type ReactNode } from 'react'
import { useQuery } from '@apollo/client/react'
import { Header } from './header'
import { Tabs } from './Tabs'
import { useAuth } from '../lib/auth/auth-context'
import { GET_PROFILE } from '../lib/auth/graphql'
import {
  useLibrariesStore,
  GET_ALL_LIBRARIES,
  type Library,
} from '../lib/libraries'

interface BrowseLayoutProps {
  children: ReactNode
}

/**
 * Shared chrome for the browse screens (Timeline / Albums / Map): the header
 * with the library switcher, the page content, and the bottom tab bar.
 */
export function BrowseLayout({ children }: BrowseLayoutProps) {
  const { user } = useAuth()
  const { data: librariesData } = useQuery(GET_ALL_LIBRARIES)
  const { data: profileData } = useQuery(GET_PROFILE)
  const { libraries, activeLibraryId, setLibraries, setActiveLibrary } =
    useLibrariesStore()

  useEffect(() => {
    if (librariesData?.allLibraries) {
      setLibraries(librariesData.allLibraries)
    }
  }, [librariesData, setLibraries])

  const profile = user
    ? {
        username: profileData?.profile?.username ?? user.username,
        email: profileData?.profile?.email ?? '',
        avatarUrl: profileData?.profile?.avatarUrl ?? null,
      }
    : null

  const handleLibraryChange = (library: Library) => {
    setActiveLibrary(library.id)
  }

  return (
    <div className="flex h-screen flex-col bg-[#1d1d1d]">
      <Header
        profile={profile}
        libraries={libraries}
        activeLibraryId={activeLibraryId}
        onLibraryChange={handleLibraryChange}
      />
      {children}
      <Tabs />
    </div>
  )
}
