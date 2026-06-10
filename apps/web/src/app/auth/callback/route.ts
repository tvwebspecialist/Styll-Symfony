import { NextResponse, type NextRequest } from 'next/server'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function redirect(url: string) {
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    return redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`)
  }

  if (!code) {
    return redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)

    const isPkceMismatch =
      error.message.toLowerCase().includes('code challenge') ||
      error.message.toLowerCase().includes('code verifier')
    const errorMsg = isPkceMismatch
      ? 'Sessione scaduta o browser non supportato. Riprova il login.'
      : error.message

    return redirect(`${origin}/login?error=${encodeURIComponent(errorMsg)}`)
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect(`${origin}/login`)
  }

  // OAuth users (Google, etc.) skip email OTP — mark them as verified
  const provider = user.app_metadata?.provider as string | undefined
  if (provider && provider !== 'email') {
    const adminDb = createAdminClient()
    await adminDb
      .from('profiles')
      .update({ email_verified: true })
      .eq('id', user.id)
      .eq('email_verified', false)
  }

  const isPwa = searchParams.get('next') === 'pwa'
  const tenantSlug = searchParams.get('tenantSlug')
  const tenantId = searchParams.get('tenantId')
  const returnTo = searchParams.get('return_to')

  if (isPwa && tenantSlug) {
    if (tenantId) await setupPwaGoogleClient(tenantId)

    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return redirect(`https://${tenantSlug}-app.styll.it/accesso?error=oauth_failed`)
    }

    const destination = (() => {
      if (!returnTo || !returnTo.startsWith('/')) return '/profilo'
      if (returnTo.includes('://')) return '/profilo'
      return returnTo
    })()

    const transferUrl = new URL(`https://${tenantSlug}-app.styll.it/auth/session-transfer`)
    transferUrl.searchParams.set('access_token', session.access_token)
    transferUrl.searchParams.set('refresh_token', session.refresh_token)
    transferUrl.searchParams.set('next', destination)

    return redirect(transferUrl.toString())
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) {
    return redirect(`${origin}/dashboard`)
  }

  return redirect(`${origin}/onboarding/step-1`)
}
