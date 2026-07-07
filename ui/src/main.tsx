import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ApolloProvider } from '@apollo/client/react'
import { RouterProvider } from '@tanstack/react-router'

import { apolloClient } from './lib/apollo-client'
import { AuthProvider, useAuth } from './lib/auth/auth-context'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastStack } from './components/ui/Toast'
import { createAppRouter } from './router'

import './index.css'

function AppWithRouter() {
  const auth = useAuth()
  const router = createAppRouter(auth)
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
