import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { useUIStore, type ToastVariant } from '../../lib/ui/store'

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'bg-red-900/90 border-red-700 text-red-100',
  success: 'bg-green-900/90 border-green-700 text-green-100',
  info: 'bg-neutral-800/90 border-neutral-600 text-neutral-100',
}

const VARIANT_ICONS: Record<ToastVariant, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
}

/**
 * Fixed toast stack surfacing mutation errors/results app-wide. Populated via
 * `addToast` in the UI store; toasts auto-dismiss and can be closed manually.
 */
export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none"
      data-testid="toast-stack"
    >
      {toasts.map((toast) => {
        const Icon = VARIANT_ICONS[toast.variant]
        return (
          <div
            key={toast.id}
            className={`
              flex items-center gap-2 max-w-md
              border rounded-lg shadow-lg backdrop-blur
              px-4 py-2.5 text-sm
              pointer-events-auto
              ${VARIANT_STYLES[toast.variant]}
            `}
            role="alert"
            data-testid={`toast-${toast.variant}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-0.5 rounded hover:bg-white/20 opacity-60 hover:opacity-100 cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
