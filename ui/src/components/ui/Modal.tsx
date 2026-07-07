import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  'data-testid'?: string
}

/**
 * Centered modal dialog with a backdrop, a coloured top accent, and
 * click-outside / Escape to close. Used for the Settings and Account panels.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  'data-testid': testId,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-[10vh]"
      onMouseDown={(e) => {
        if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
          onClose()
        }
      }}
      data-testid={testId}
    >
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md overflow-hidden rounded-lg bg-[#2a2a2a] shadow-2xl"
      >
        <div className="h-1 bg-teal-500" />
        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-sm text-neutral-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="-mr-2 -mt-1 rounded p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
            aria-label="Close"
            data-testid="modal-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-6 pb-6 pt-4">{children}</div>
      </div>
    </div>
  )
}
