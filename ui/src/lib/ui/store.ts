import { create } from 'zustand'

export type ActiveModal = 'settings' | 'account' | null

export type ToastVariant = 'error' | 'success' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

const TOAST_DURATION_MS = 5000

let nextToastId = 1

interface UIState {
  activeModal: ActiveModal
  openModal: (modal: Exclude<ActiveModal, null>) => void
  closeModal: () => void
  toasts: Toast[]
  addToast: (message: string, variant?: ToastVariant) => void
  removeToast: (id: number) => void
}

/**
 * Global UI state for app-level overlays: Settings / Account modals opened
 * from the header menu, and the toast stack for surfacing mutation results.
 */
export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
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
