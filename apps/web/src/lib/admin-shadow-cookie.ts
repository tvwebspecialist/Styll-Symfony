import type { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const ADMIN_SHADOW_COOKIE = 'styll_impersonate_tenant'
export const ADMIN_SHADOW_COOKIE_MAX_AGE = 60 * 60 * 4
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface AdminShadowCookiePayload {
  actorId: string
  tenantId: string
}

function getAdminShadowCookieDomain(): string | undefined {
  return process.env.NODE_ENV === 'production'
    ? `.${process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'}`
    : undefined
}

function buildAdminShadowCookieOptions() {
  const domain = getAdminShadowCookieDomain()

  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...(domain ? { domain } : {}),
  }
}

export function serializeAdminShadowCookieValue(actorId: string, tenantId: string) {
  return `${actorId}:${tenantId}`
}

export function parseAdminShadowCookieValue(
  value: string | null | undefined,
): AdminShadowCookiePayload | null {
  if (!value) return null

  const [actorId, tenantId, ...rest] = value.split(':')
  if (rest.length > 0) return null
  if (!UUID_PATTERN.test(actorId) || !UUID_PATTERN.test(tenantId)) return null

  return { actorId, tenantId }
}

export function setAdminShadowCookie(
  cookieStore: { set: (name: string, value: string, options?: Record<string, unknown>) => void },
  tenantId: string,
  actorId: string,
) {
  cookieStore.set(ADMIN_SHADOW_COOKIE, serializeAdminShadowCookieValue(actorId, tenantId), {
    ...buildAdminShadowCookieOptions(),
    maxAge: ADMIN_SHADOW_COOKIE_MAX_AGE,
  })
}

export function clearAdminShadowCookie(
  cookieStore: { set: (name: string, value: string, options?: Record<string, unknown>) => void },
) {
  cookieStore.set(ADMIN_SHADOW_COOKIE, '', {
    ...buildAdminShadowCookieOptions(),
    maxAge: 0,
  })
}

export function clearAdminShadowCookieOnResponse(response: NextResponse) {
  response.cookies.set(ADMIN_SHADOW_COOKIE, '', {
    ...buildAdminShadowCookieOptions(),
    maxAge: 0,
  })
}

export async function getValidatedAdminShadowContext(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
  shadowCookieValue: string | null | undefined,
): Promise<{
  isSuperadmin: boolean
  tenantId: string | null
  businessName: string | null
}> {
  const payload = parseAdminShadowCookieValue(shadowCookieValue)
  if (!payload || payload.actorId !== userId) {
    return { isSuperadmin: false, tenantId: null, businessName: null }
  }

  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', userId)
    .maybeSingle()

  const isSuperadmin = !!profile?.is_superadmin
  if (!isSuperadmin) {
    return { isSuperadmin: false, tenantId: null, businessName: null }
  }

  const { data: tenant } = await db
    .from('tenants')
    .select('id, business_name')
    .eq('id', payload.tenantId)
    .maybeSingle()

  return {
    isSuperadmin: true,
    tenantId: tenant?.id ?? null,
    businessName: tenant?.business_name ?? null,
  }
}
