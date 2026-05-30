'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { createGuestBooking } from '@/lib/actions/create-booking'
import { getPendingBooking, clearPendingBooking } from '@/lib/pwa-pending-booking'

export default function AuthCallbackPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()

  useEffect(() => {
    const slug = params.slug
    const authBase = `/tenant/app/${slug}/auth`
    const hash = window.location.hash

    const searchParams = new URLSearchParams(hash.substring(1))
    const errorCode = searchParams.get('error_code')
    const accessToken = searchParams.get('access_token')
    const refreshToken = searchParams.get('refresh_token')

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
          // Also persist in localStorage so the session survives iOS cold launch
          const pwa = createPwaClient()
          await pwa.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })

          // Complete pending booking if user verified email during booking flow
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
