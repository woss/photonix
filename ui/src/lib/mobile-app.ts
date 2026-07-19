import { create } from 'zustand'

/**
 * Integration hooks for the native mobile/desktop wrapper apps.
 *
 * The mobile app (photonix-mobile) loads the web UI in a WebView with
 * `PhotonixMobileApp` appended to the user agent and, once the page has
 * loaded, injects JavaScript that:
 *   - assigns `window.photonix.openAppMenu` (posts a message that opens the
 *     native drawer) — so `window.photonix` must already exist;
 *   - calls `window.photonix.store.dispatch({ type: 'SET_SAFE_AREA_TOP',
 *     payload: <px> })` with the device's top inset (Redux-style API kept for
 *     compatibility with the old UI).
 * Desktop/mobile wrappers may also call `window.showSettings()`.
 */

interface LayoutState {
  // True when running inside the native mobile app's WebView.
  isMobileApp: boolean
  // Top safe-area inset in px, pushed in by the mobile wrapper.
  safeAreaTop: number
  setSafeAreaTop: (px: number) => void
}

export const useLayoutStore = create<LayoutState>()((set) => ({
  isMobileApp: navigator.userAgent.includes('PhotonixMobileApp'),
  safeAreaTop: 0,
  setSafeAreaTop: (px) => set({ safeAreaTop: px }),
}))

interface HostAppAction {
  type: string
  payload?: unknown
}

declare global {
  interface Window {
    photonix?: {
      store: { dispatch: (action: HostAppAction) => void }
      // Assigned by the mobile wrapper after page load.
      openAppMenu?: () => void
    }
    showSettings?: () => void
  }
}

/** Install the `window` API the native wrappers depend on. Call once at boot. */
export function installHostAppHooks(): void {
  window.photonix = {
    // Redux-compatible dispatch shim over the zustand layout store.
    store: {
      dispatch: (action) => {
        if (action?.type === 'SET_SAFE_AREA_TOP') {
          useLayoutStore.getState().setSafeAreaTop(Number(action.payload) || 0)
        }
      },
    },
  }

  // Settings is a routed page now. This full-navigation fallback is replaced
  // with an SPA router.navigate() binding once the router mounts (main.tsx),
  // so the wrapper contract keeps working even if called very early.
  window.showSettings = () => {
    window.location.assign('/settings')
  }
}
