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
  const { data: { session: exchangedSession }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)

    const isPkceMismatch =
      error.message.toLowerCase().includes('code challenge') ||
      error.message.toLowerCase().includes('code verifier')
    const errorMsg = isPkceMismatch
      ? 'Sessione scaduta o browser non supportato. Riprova il login. Se hai bloccato i cookie o usi la modalita privata, abilita i cookie per styll.it e riprova.'
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

    // Use tokens from exchangeCodeForSession directly — calling getSession()
    // separately can trigger an internal token refresh, rotating the refresh_token
    // and making it stale by the time session-transfer calls setSession().
    if (!exchangedSession?.access_token || !exchangedSession?.refresh_token) {
      return redirect(`https://${tenantSlug}-app.styll.it/accesso?error=session_failed`)
    }

    const destination = (() => {
      if (!returnTo || !returnTo.startsWith('/')) return '/profilo'
      if (returnTo.includes('://')) return '/profilo'
      return returnTo
    })()

    const transferUrl = new URL(`https://${tenantSlug}-app.styll.it/auth/session-transfer`)
    transferUrl.searchParams.set('access_token', exchangedSession.access_token)
    transferUrl.searchParams.set('refresh_token', exchangedSession.refresh_token)
    transferUrl.searchParams.set('next', destination)

    return redirect(transferUrl.toString())
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  // Prefer the onboarding_completed flag, but fall back to checking staff_members
  // directly. This handles tenants whose profile was created before the flag existed
  // or where a partial onboarding run left the flag unset.
  if (profile?.onboarding_completed) {
    return redirect(`${origin}/dashboard`)
  }

  const adminDb = createAdminClient()
  const { data: staffRow } = await adminDb
    .from('staff_members')
    .select('id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .limit(1)
    .maybeSingle()

  if (staffRow) {
    // Self-heal: flag may be null for tenants created before it existed.
    // Idempotent — only runs when onboarding_completed is not already true.
    await adminDb
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id)
    return redirect(`${origin}/dashboard`)
  }

  return redirect(`${origin}/onboarding/step-1`)
}
