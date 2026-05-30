'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { createClient as createCookieClient } from '@/lib/supabase/client'

export function PwaSessionRestorer() {
  const router = useRouter()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const pwa = createPwaClient()
    const cookie = createCookieClient()

    void (async () => {
      const [{ data: { session: pwaSession } }, { data: { session: cookieSession } }] =
        await Promise.all([pwa.auth.getSession(), cookie.auth.getSession()])

      if (pwaSession && !cookieSession) {
        // iOS cold launch: localStorage has session but cookies are gone.
        // Restore to cookies so server components can read it, then re-render.
        const { error } = await cookie.auth.setSession({
          access_token: pwaSession.access_token,
          refresh_token: pwaSession.refresh_token,
        })
        if (!error) router.refresh()
      } else if (!pwaSession && cookieSession) {
        // Migration path: user logged in before localStorage was introduced.
        // Sync cookie session to localStorage so future iOS launches work.
        await pwa.auth.setSession({
          access_token: cookieSession.access_token,
          refresh_token: cookieSession.refresh_token,
        })
      }
    })()

    const { data: { subscription } } = pwa.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        cookie.auth.signOut({ scope: 'local' }).catch(() => {})
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return null
}
