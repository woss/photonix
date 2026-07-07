import { useUIStore } from '../lib/ui/store'
import { SettingsModal } from './settings/SettingsModal'
import { AccountModal } from './account/AccountModal'

/**
 * Renders whichever app-level modal is currently open (driven by the UI store).
 * Mounted once in the authenticated layout so modals are reachable from any
 * screen via the header menu.
 */
export function ModalRoot() {
  const activeModal = useUIStore((s) => s.activeModal)
  const closeModal = useUIStore((s) => s.closeModal)

  if (activeModal === 'settings') {
    return <SettingsModal onClose={closeModal} />
  }
  if (activeModal === 'account') {
    return <AccountModal onClose={closeModal} />
  }
  return null
}
