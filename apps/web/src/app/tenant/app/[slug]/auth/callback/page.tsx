'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { createGuestBooking } from '@/lib/actions/create-booking'
import { getPendingBooking, clearPendingBooking } from '@/lib/pwa-pending-booking'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'

export default function AuthCallbackPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()

  useEffect(() => {
    const slug = params.slug
    const authBase = `/tenant/app/${slug}/auth`
    const searchParams = new URLSearchParams(window.location.search)
    const code = searchParams.get('code')
    const tenantId = searchParams.get('tenantId') ?? ''

    if (code) {
      // Google OAuth — PKCE code exchange
      const supabase = createClient()
      supabase.auth
        .exchangeCodeForSession(code)
        .then(async ({ data, error }) => {
          if (error || !data.session) {
            router.replace(`${authBase}?error=Accesso+non+riuscito.+Riprova.`)
            return
          }

          // Persist to localStorage for iOS PWA cold-launch
          const pwa = createPwaClient()
          await pwa.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })

          if (tenantId) {
            await setupPwaGoogleClient(tenantId)
          }

          router.push(`/tenant/app/${slug}/profilo`)
          router.refresh()
        })
        .catch(() => {
          router.replace(`${authBase}?error=Accesso+non+riuscito.+Riprova.`)
        })
      return
    }

    // Magic link (hash-based implicit flow)
    const hash = window.location.hash
    const hashParams = new URLSearchParams(hash.substring(1))
    const errorCode = hashParams.get('error_code')
    const accessToken = hashParams.get('access_token')
    const refreshToken = hashParams.get('refresh_token')

    if (errorCode || !accessToken || !refreshToken) {
      router.replace(`${authBase}?error=Link+non+valido.+Prova+ad+accedere.`)
      return
    }

    const supabase = createClient()

    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(async ({ error }) => {
        if (error) {
          router.replace(`${authBase}?error=Sessione+non+valida.+Riprova.`)
        } else {
          const pwa = createPwaClient()
          await pwa.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

          const pending = getPendingBooking()
          if (pending?.pendingAuth) {
            clearPendingBooking()
            const result = await createGuestBooking({
              slug: pending.slug,
              tenantId: pending.tenantId,
              locationId: pending.locationId,
              staffId: pending.staffId,
              serviceIds: pending.serviceIds,
              date: pending.date,
              time: pending.time,
              fullName: pending.fullName,
              phone: pending.phone,
              email: pending.email,
              notes: '',
              marketingConsent: false,
              productIds: pending.productIds ?? [],
            })
            if (result.success && result.appointmentId) {
              router.push(`/tenant/app/${pending.slug}/prenota/successo?appointment=${result.appointmentId}`)
              router.refresh()
              return
            }
          }

          router.push('/')
          router.refresh()
        }
      })
      .catch((err) => {
        console.error('[auth/callback] setSession error:', err)
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
