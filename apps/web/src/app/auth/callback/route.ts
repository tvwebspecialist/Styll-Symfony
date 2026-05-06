import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  // TODO: remove after confirming OAuth callback is reached
  console.log('[auth/callback] request.url:', request.url)

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const errorDescription = searchParams.get('error_description')

  if (errorDescription) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('[auth/callback] exchangeCodeForSession error:', error.message)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) {
    return NextResponse.redirect(`${origin}/dashboard`)
  }

  return NextResponse.redirect(`${origin}/onboarding/step-1`)
}
