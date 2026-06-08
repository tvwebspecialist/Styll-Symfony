'use client'

/**
 * Guard client-side per la pagina profilo nella PWA.
 *
 * Problema: la sessione viene salvata in localStorage (pwa-client) ma il
 * Server Component legge i cookie. Al primo render dopo un cold launch su iOS,
 * PwaSessionRestorer non ha ancora copiato la sessione nei cookie, quindi il
 * server vede l'utente come guest e mostra il LoginGate.
 *
 * Soluzione: questo componente aspetta che PwaSessionRestorer abbia completato
 * il suo lavoro (max ~1s) prima di decidere se mostrare il contenuto o il gate.
 * Se trova la sessione in localStorage, mostra uno spinner e aspetta il refresh.
 * Se non trova nessuna sessione neanche in localStorage, mostra il LoginGate.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPwaClient } from '@/lib/supabase/pwa-client'

interface Props {
  slug: string
  tenantId: string
  loginGate: React.ReactNode
  children: React.ReactNode
}

export function ProfiloAuthGuard({ slug: _slug, tenantId: _tenantId, loginGate, children }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'checking' | 'authenticated' | 'guest'>('checking')

  useEffect(() => {
    const pwa = createPwaClient()
    pwa.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Sessione trovata in localStorage → PwaSessionRestorer la copierà nei cookie
        // e farà router.refresh() — aspettiamo
        setState('authenticated')
        // Forza un refresh per assicurarsi che i cookie siano aggiornati
        router.refresh()
      } else {
        setState('guest')
      }
    })
  }, [router])

  if (state === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7F7F7]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-800" />
          <p className="text-sm text-neutral-400">Caricamento profilo…</p>
        </div>
      </main>
    )
  }

  if (state === 'guest') {
    return <>{loginGate}</>
  }

  return <>{children}</>
}
