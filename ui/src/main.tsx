import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { RouterProvider } from '@tanstack/react-router'

import { apolloClient } from './lib/apollo-client'
import { AuthProvider, useAuth } from './lib/auth/auth-context'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastStack } from './components/ui/Toast'
import { createAppRouter } from './router'
import { installHostAppHooks } from './lib/mobile-app'

import './index.css'

// window.photonix / window.showSettings for the native mobile/desktop wrappers.
installHostAppHooks()

function AppWithRouter() {
  const auth = useAuth()
  const router = createAppRouter(auth)

  // Upgrade the native wrappers' `window.showSettings()` from the full-page
  // fallback (installHostAppHooks) to an in-app navigation.
  useEffect(() => {
    window.showSettings = () => {
      router.navigate({ to: '/settings' })
    }
  }, [router])

  return <RouterProvider router={router} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <AppWithRouter />
          <ToastStack />
        </AuthProvider>
      </ApolloProvider>
    </ErrorBoundary>
  </StrictMode>
)
