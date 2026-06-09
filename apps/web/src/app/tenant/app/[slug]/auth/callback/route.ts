import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'

function redirectTo(url: string) {
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'no-store')
  return res
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)

  const code = searchParams.get('code')
  const tenantId = searchParams.get('tenantId') ?? ''
  const returnTo = searchParams.get('return_to')
  const oauthError = searchParams.get('error_description') ?? searchParams.get('error')

  // Use the Host header so the redirect URL matches the actual domain the
  // browser is on (subdomain or localhost), bypassing any proxy rewrite.
  const host = request.headers.get('host') ?? new URL(request.url).host
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const origin = `${protocol}://${host}`

  // On a subdomain the reverse proxy prepends /tenant/app/[slug] to every
  // incoming path. Redirecting to the absolute origin URL bypasses that
  // rewrite so we avoid the double-slug 404.
  const isSubdomain =
    !host.startsWith('localhost') &&
    host !== 'styll.it' &&
    host !== 'www.styll.it'

  const accessoPath = isSubdomain ? '/accesso' : `/tenant/app/${slug}/accesso`

  if (oauthError) {
    return redirectTo(`${origin}${accessoPath}?error=oauth_failed`)
  }

  if (!code) {
    return redirectTo(`${origin}${accessoPath}`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return redirectTo(`${origin}${accessoPath}?error=oauth_failed`)
  }

  if (tenantId) {
    await setupPwaGoogleClient(tenantId)
  }

  const safePath =
    returnTo &&
    returnTo.startsWith('/') &&
    !returnTo.startsWith('//') &&
    !returnTo.includes('://')
      ? returnTo
      : '/profilo'

  const destination = isSubdomain
    ? `${origin}${safePath}`
    : `${origin}/tenant/app/${slug}${safePath}`

  return redirectTo(destination)
}
