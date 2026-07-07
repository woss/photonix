import { Component, type ReactNode } from 'react'

interface ErrorFallbackProps {
  error?: unknown
}

/**
 * Full-screen crash fallback shown when rendering throws. Used both by the
 * top-level ErrorBoundary and as the router's defaultErrorComponent.
 */
export function ErrorFallback({ error }: ErrorFallbackProps) {
  const message =
    error instanceof Error ? error.message : 'An unexpected error occurred'

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-neutral-900 p-6"
      data-testid="error-fallback"
    >
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-white text-2xl font-semibold">
          Something went wrong
        </h1>
        <p className="text-neutral-400 text-sm break-words">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white text-sm cursor-pointer"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

interface ErrorBoundaryState {
  error: Error | null
}

/**
 * Last-resort boundary around the whole app so an uncaught render error shows
 * a recoverable message instead of a blank screen. Route-level errors are
 * handled by the router's defaultErrorComponent (same fallback UI).
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Uncaught render error:', error)
  }

  render() {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} />
    }
    return this.props.children
  }
}
