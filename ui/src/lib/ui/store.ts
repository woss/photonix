import { create } from 'zustand'

export type ToastVariant = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const TOAST_DURATION_MS = 5000

let nextToastId = 1

interface UIState {
  toasts: Toast[]
  addToast: (message: string, variant?: ToastVariant) => void
  removeToast: (id: number) => void
}

/**
 * Global UI state: the toast stack for surfacing mutation results.
 * (Settings and Account are routed pages under /settings, not modals.)
 */
export const useUIStore = create<UIState>()((set) => ({
  toasts: [],
  addToast: (message, variant = 'error') => {
    const id = nextToastId++
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

/** Imperative helper for non-React call sites (stores, link chain, catch blocks). */
export const addToast = (message: string, variant?: ToastVariant) =>
  useUIStore.getState().addToast(message, variant)
