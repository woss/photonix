import { createRouter } from '@tanstack/react-router'
import { routeTree } from './routeTree.gen'
import { ErrorFallback } from './components/ErrorBoundary'
import type { AuthContextValue } from './lib/auth/types'

export interface RouterContext {
  auth: AuthContextValue
}

export const createAppRouter = (auth: AuthContextValue) =>
  createRouter({
    routeTree,
    context: { auth },
    defaultPreload: 'intent',
    defaultErrorComponent: ({ error }) => <ErrorFallback error={error} />,
  })

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}
