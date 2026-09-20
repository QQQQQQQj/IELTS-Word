import { useState } from 'react'

/**
 * Vitest stand-in for `virtual:pwa-register/react`, which only exists
 * inside the Vite build. Behaves like an idle service-worker registration.
 */
export function useRegisterSW(_options?: unknown) {
  const offlineReady = useState(false)
  const needRefresh = useState(false)
  return {
    offlineReady,
    needRefresh,
    updateServiceWorker: async (_reload?: boolean) => {},
  }
}
