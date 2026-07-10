import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractConsentRequestContext } from '@/lib/consent-events'
import { revokeMarketingConsentWithToken } from '@/lib/marketing-unsubscribe'
import { getTenantBySlug } from '@/lib/tenant'
import { buildTenantAppUrl } from '@/lib/auth/urls'

function redirectToStatus(slug: string, status: 'revoked' | 'already' | 'invalid' | 'expired') {
  return NextResponse.redirect(
    buildTenantAppUrl(slug, `/preferenze-marketing?status=${status}`),
    { status: 303 },
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const token = request.nextUrl.searchParams.get('token')?.trim() ?? ''
  if (!token) {
    return redirectToStatus(slug, 'invalid')
  }

  const formData = await request.formData().catch(() => null)
  const confirm = formData?.get('confirm')
  const listUnsubscribe = formData?.get('List-Unsubscribe')

  const isBrowserForm = confirm === '1'
  const isOneClick = listUnsubscribe === 'One-Click'

  if (!isBrowserForm && !isOneClick) {
    return isOneClick
      ? NextResponse.json({ ok: true }, { status: 200 })
      : redirectToStatus(slug, 'invalid')
  }

  const db = createAdminClient()
  const result = await revokeMarketingConsentWithToken(db, {
    tenantId: tenant.tenant_id,
    token,
    requestContext: extractConsentRequestContext(request.headers),
  })

  if (isOneClick) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (result === 'revoked') return redirectToStatus(slug, 'revoked')
  if (result === 'already_unsubscribed') return redirectToStatus(slug, 'already')
  return redirectToStatus(slug, 'expired')
}
