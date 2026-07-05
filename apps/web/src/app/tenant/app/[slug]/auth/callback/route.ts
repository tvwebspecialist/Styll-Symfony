import { NextResponse, type NextRequest } from 'next/server'
import { buildTenantAppUrl, sanitizeAppRelativePath } from '@/lib/auth/urls'
import { createClient } from '@/lib/supabase/server'
import { setupPwaGoogleClient } from '@/lib/actions/pwa-auth'
import { createAdminClient } from '@/lib/supabase/admin'

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
  const accessoUrl = new URL(buildTenantAppUrl(slug, '/accesso'))

  if (oauthError) {
    accessoUrl.searchParams.set('error', 'oauth_failed')
    return redirectTo(accessoUrl.toString())
  }

  if (!code) {
    return redirectTo(accessoUrl.toString())
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    accessoUrl.searchParams.set('error', 'oauth_failed')
    return redirectTo(accessoUrl.toString())
  }

  const adminDb = createAdminClient()
  const { data: tenant } = await adminDb
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle()

  const resolvedTenantId = tenant?.id ?? tenantId

  if (resolvedTenantId) {
    await setupPwaGoogleClient(resolvedTenantId)
  }

  const safePath = sanitizeAppRelativePath(returnTo, '/profilo')
  const destination = new URL(buildTenantAppUrl(slug, safePath))
  destination.searchParams.set('google_login', '1')

  return redirectTo(destination.toString())
}
