import { NextRequest, NextResponse } from 'next/server'
import { mergeClientProfile } from '@/lib/actions/client-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type')
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`
  const tp = await createTenantPaths(slug)

  const errorUrl = `${baseUrl}${tp('/auth')}?error=${encodeURIComponent('Link non valido. Prova ad accedere.')}`

  if (!code) {
    return NextResponse.redirect(errorUrl)
  }

  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(errorUrl)
  }

  if (type === 'signup') {
    const tenant = await getTenantBySlug(slug)
    if (tenant) {
      await mergeClientProfile({
        tenantId: tenant.tenant_id,
        profileId: data.user.id,
        email: data.user.email ?? '',
        phone: typeof data.user.user_metadata?.phone === 'string' ? data.user.user_metadata.phone : '',
        fullName:
          typeof data.user.user_metadata?.full_name === 'string'
            ? data.user.user_metadata.full_name
            : '',
        marketingConsent: Boolean(data.user.user_metadata?.marketing_consent),
      })
    }
    return NextResponse.redirect(`${baseUrl}${tp('')}`)
  }

  if (type === 'recovery') {
    return NextResponse.redirect(`${baseUrl}${tp('/accesso/reset-password')}`)
  }

  return NextResponse.redirect(`${baseUrl}${tp('') || '/'}`)
}
