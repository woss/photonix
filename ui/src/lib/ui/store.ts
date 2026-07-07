import { create } from 'zustand'

export type ActiveModal = 'settings' | 'account' | null

interface UIState {
  activeModal: ActiveModal
  openModal: (modal: Exclude<ActiveModal, null>) => void
  closeModal: () => void
}

/**
 * Global UI state for app-level overlays (Settings / Account modals) opened
 * from the header menu.
 */
export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}))
