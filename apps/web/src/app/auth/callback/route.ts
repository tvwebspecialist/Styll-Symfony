import { NextResponse, type NextRequest } from 'next/server'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'
import { buildRootAppUrl, buildTenantAppUrl, sanitizeAppRelativePath } from '@/lib/auth/urls'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function redirect(url: string) {
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    const loginUrl = new URL(buildRootAppUrl('/login'))
    loginUrl.searchParams.set('error', errorDescription)
    return redirect(loginUrl.toString())
  }

  if (!code) {
    return redirect(buildRootAppUrl('/login'))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)

    const isPkceMismatch =
      error.message.toLowerCase().includes('code challenge') ||
      error.message.toLowerCase().includes('code verifier')
    const errorMsg = isPkceMismatch
      ? 'Sessione scaduta o browser non supportato. Riprova il login. Se hai bloccato i cookie o usi la modalita privata, abilita i cookie per styll.it e riprova.'
      : error.message

    const loginUrl = new URL(buildRootAppUrl('/login'))
    loginUrl.searchParams.set('error', errorMsg)
    return redirect(loginUrl.toString())
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return redirect(buildRootAppUrl('/login'))
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
  const returnTo = searchParams.get('return_to')

  if (isPwa && tenantSlug) {
    const adminDb = createAdminClient()
    const { data: tenant } = await adminDb
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .eq('status', 'active')
      .maybeSingle()

    if (!tenant?.id) {
      const loginUrl = new URL(buildRootAppUrl('/login'))
      loginUrl.searchParams.set('error', 'Salone non valido o non disponibile. Riprova dal link corretto.')
      return redirect(loginUrl.toString())
    }

    await setupPwaGoogleClient(tenant.id)

    const destination = sanitizeAppRelativePath(returnTo, '/profilo')
    const destinationUrl = new URL(buildTenantAppUrl(tenantSlug, destination))
    destinationUrl.searchParams.set('google_login', '1')
    return redirect(destinationUrl.toString())
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
    return redirect(buildRootAppUrl('/dashboard'))
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
    return redirect(buildRootAppUrl('/dashboard'))
  }

  return redirect(buildRootAppUrl('/onboarding/step-1'))
}
