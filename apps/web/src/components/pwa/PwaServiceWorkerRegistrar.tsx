'use client'

import { useEffect } from 'react'

/**
 * Registra il Service Worker della PWA (`/sw.js`) per abilitare l'offline-first.
 *
 * - Registrazione su `load` per non competere con le risorse critiche.
 * - Idempotente con la registrazione fatta da usePushSubscription (stesso URL e
 *   scope → il browser deduplica).
 * - Montato solo quando la PWA NON è in preview dashboard (vedi PwaPreviewShell),
 *   così l'iframe di anteprima non installa il SW.
 */
export function PwaServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* registrazione SW non disponibile: la PWA funziona comunque online */
      })
    }

    if (document.readyState === 'complete') {
      register()
      return
    }

    window.addEventListener('load', register, { once: true })
    return () => window.removeEventListener('load', register)
  }, [])

  return null
}
