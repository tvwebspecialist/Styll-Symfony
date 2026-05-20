'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
      .then(({ error }) => {
        if (error) {
          router.replace(`${authBase}?error=Sessione+non+valida.+Riprova.`)
        } else {
          router.replace(`/tenant/app/${slug}`)
        }
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
