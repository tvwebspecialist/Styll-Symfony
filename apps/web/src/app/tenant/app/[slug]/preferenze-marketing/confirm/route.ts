import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractConsentRequestContext } from '@/lib/consent-events'
import { revokeMarketingConsentWithToken } from '@/lib/marketing-unsubscribe'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

async function redirectToStatus(
  request: NextRequest,
  slug: string,
  status: 'revoked' | 'already' | 'invalid' | 'expired',
) {
  const tp = await createTenantPaths(slug)
  return NextResponse.redirect(
    new URL(tp(`/preferenze-marketing?status=${status}`), request.url),
    { status: 303 },
  )
}

function jsonStatus(status: 'revoked' | 'already' | 'invalid' | 'expired') {
  const responseStatus =
    status === 'invalid' || status === 'expired'
      ? 400
      : 200

  return NextResponse.json(
    { ok: responseStatus === 200, status },
    { status: responseStatus },
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const wantsJson = request.headers.get('x-styll-ajax') === '1'
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const token = request.nextUrl.searchParams.get('token')?.trim() ?? ''
  if (!token) {
    return wantsJson
      ? jsonStatus('invalid')
      : redirectToStatus(request, slug, 'invalid')
  }

  const formData = await request.formData().catch(() => null)
  const confirm = formData?.get('confirm')
  const listUnsubscribe = formData?.get('List-Unsubscribe')

  const isBrowserForm = confirm === '1'
  const isOneClick = listUnsubscribe === 'One-Click'

  if (!isBrowserForm && !isOneClick) {
    return isOneClick
      ? NextResponse.json({ ok: true }, { status: 200 })
      : wantsJson
        ? jsonStatus('invalid')
        : redirectToStatus(request, slug, 'invalid')
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

  const status =
    result === 'revoked'
      ? 'revoked'
      : result === 'already_unsubscribed'
        ? 'already'
        : 'expired'

  return wantsJson
    ? jsonStatus(status)
    : redirectToStatus(request, slug, status)
}
