import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from './dialog'

interface ModalProps {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  'data-testid'?: string
}

// Photonix master brand accent: five equal segments.
const BRAND_SEGMENTS = [
  'var(--brand-1)',
  'var(--brand-2)',
  'var(--brand-3)',
  'var(--brand-4)',
  'var(--brand-5)',
]

/**
 * Centered modal dialog built on the shadcn (Radix) Dialog. Keeps the master
 * five-segment brand accent strip along the top, Escape / overlay-click /
 * X-button close, and a dark (#1d1d1d) surface with no light borders. Used for
 * the Settings and Account panels.
 */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  'data-testid': testId,
}: ModalProps) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent
        showCloseButton={false}
        data-testid={testId}
        aria-label={title}
        {...(subtitle ? {} : { 'aria-describedby': undefined })}
        className="top-[10vh] max-w-md translate-y-0 gap-0 overflow-hidden border-0 bg-background p-0 shadow-2xl sm:max-w-md"
      >
        {/* Master brand accent strip */}
        <div className="flex h-[3px] w-full" aria-hidden="true">
          {BRAND_SEGMENTS.map((color) => (
            <div key={color} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>

        <div className="flex items-start justify-between px-6 pt-5">
          <div>
            <DialogTitle className="text-lg font-semibold text-white">
              {title}
            </DialogTitle>
            {subtitle && (
              <DialogDescription className="mt-0.5 text-sm text-neutral-400">
                {subtitle}
              </DialogDescription>
            )}
          </div>
          <DialogClose
            aria-label="Close"
            data-testid="modal-close"
            className="-mr-2 -mt-1 rounded p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white focus:outline-none"
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        <div className="px-6 pb-6 pt-4">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
