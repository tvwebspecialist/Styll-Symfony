'use client'

import { useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'

/**
 * Validates a return_to value and builds the full destination path.
 * Only allows relative paths within the tenant's PWA to prevent open redirect.
 */
function buildDestination(slug: string, returnTo: string | null): string {
  const fallback = `/tenant/app/${slug}/profilo`
  if (!returnTo) return fallback
  // Must be a relative path: starts with '/', no '//', no protocol
  if (!returnTo.startsWith('/') || returnTo.startsWith('//') || returnTo.includes('://')) {
    return fallback
  }
  return `/tenant/app/${slug}${returnTo}`
}

export default function AuthCallbackPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  // Guard: prevents double execution in React StrictMode and on remount,
  // which would cause the second exchangeCodeForSession to fail with a
  // PKCE code verifier mismatch (the code can only be exchanged once).
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    const slug = params.slug
    const accesso = `/tenant/app/${slug}/accesso`
    const sp = new URLSearchParams(window.location.search)
    const code = sp.get('code')
    const tenantId = sp.get('tenantId') ?? ''
    const returnTo = sp.get('return_to')
    // Google sometimes sends error details as query params
    const oauthError = sp.get('error_description') ?? sp.get('error')

    if (oauthError) {
      router.replace(`${accesso}?error=oauth_failed`)
      return
    }

    if (!code) {
      // No code and no error → unexpected state, send to login
      router.replace(accesso)
      return
    }

    const supabase = createClient()

    supabase.auth
      .exchangeCodeForSession(code)
      .then(async ({ data, error }) => {
        if (error || !data.session) {
          // Detect PKCE mismatch (code already used or verifier missing)
          const msg = (error?.message ?? '').toLowerCase()
          const isPkceMismatch =
            msg.includes('code') && (msg.includes('verifier') || msg.includes('challenge'))

          if (isPkceMismatch) {
            // Code may have already been exchanged (e.g. page refresh).
            // If the user already has an active session, just send them along.
            const {
              data: { user },
            } = await supabase.auth.getUser()
            if (user) {
              router.replace(buildDestination(slug, returnTo))
              return
            }
          }

          router.replace(`${accesso}?error=oauth_failed`)
          return
        }

        // Persist to localStorage so iOS PWA cold-launch finds the session
        try {
          const pwa = createPwaClient()
          await pwa.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
        } catch {
          // Non-blocking: PwaSessionRestorer handles the sync as fallback
        }

        // Set user_type = 'client' and link/create the clients record
        if (tenantId) {
          await setupPwaGoogleClient(tenantId)
        }

        // Replace history entry so Back doesn't return to the callback URL
        router.replace(buildDestination(slug, returnTo))
        router.refresh()
      })
      .catch(() => {
        router.replace(`${accesso}?error=oauth_failed`)
      })
  }, [params.slug, router])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100dvh',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '3px solid currentColor',
          borderTopColor: 'transparent',
          animation: 'spin 0.8s linear infinite',
        }}
        aria-label="Caricamento…"
        role="status"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
