import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import {
 ANALYTICS_CONSENT_ANON_COOKIE,
 ANALYTICS_CONSENT_COOKIE_MAX_AGE_SECONDS,
 type AnalyticsConsentState,
} from '@/lib/analytics-consent-server'
import {
 appendAnalyticsConsentEvent,
 buildAnalyticsConsentRequestContext,
 createAnalyticsAnonymousId,
 readAnalyticsConsentSnapshot,
  type AnalyticsConsentSnapshot,
  normalizeAnalyticsConsentState,
} from '@/lib/analytics-consent-server'
import {
  ANALYTICS_CONSENT_SOURCE,
} from '@/lib/analytics-consent-copy'

const AnalyticsConsentSchema = z.object({
  anonymousId: z.string().uuid().optional(),
  pathname: z.string().min(1).optional(),
  source: z.nativeEnum(ANALYTICS_CONSENT_SOURCE),
  status: z.enum(['accepted', 'rejected']),
})

function shouldUseSecureCookies(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:'
}

function readPathnameFromUrl(raw: string | null): string | null {
  if (!raw) return null
  try {
    return new URL(raw).pathname || null
  } catch {
    return null
  }
}

function resolveContextPathname(
  request: NextRequest,
  explicitPathname?: string | null,
): string {
  const candidate =
    explicitPathname?.trim()
    || request.nextUrl.searchParams.get('pathname')?.trim()
    || readPathnameFromUrl(request.headers.get('referer'))
    || request.nextUrl.pathname

  return candidate.startsWith('/') ? candidate : `/${candidate}`
}

function attachConsentCookies(
  response: NextResponse,
  anonymousId: string,
  request: NextRequest,
): void {
  response.cookies.set({
    name: ANALYTICS_CONSENT_ANON_COOKIE,
    value: anonymousId,
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(request),
    path: '/',
    maxAge: ANALYTICS_CONSENT_COOKIE_MAX_AGE_SECONDS,
  })
}

function jsonResponse(
  snapshot: AnalyticsConsentSnapshot,
  request: NextRequest,
): NextResponse {
  const response = NextResponse.json(snapshot)

  if (snapshot.anonymousId) {
    attachConsentCookies(response, snapshot.anonymousId, request)
  }

  return response
}

export async function GET(request: NextRequest) {
  const db = createAdminClient()
  const anonymousId = request.cookies.get(ANALYTICS_CONSENT_ANON_COOKIE)?.value ?? null
  const context = buildAnalyticsConsentRequestContext(
    request.headers,
    resolveContextPathname(request),
  )
  const snapshot = await readAnalyticsConsentSnapshot(db, {
    anonymousId,
    host: context.host,
    surface: context.surface,
  })

  return jsonResponse(snapshot, request)
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const parsed = AnalyticsConsentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const anonymousId =
    parsed.data.anonymousId
    || request.cookies.get(ANALYTICS_CONSENT_ANON_COOKIE)?.value
    || createAnalyticsAnonymousId()

  const context = buildAnalyticsConsentRequestContext(
    request.headers,
    resolveContextPathname(request, parsed.data.pathname),
  )
  const db = createAdminClient()

  await appendAnalyticsConsentEvent(db, {
    anonymousId,
    context,
    source: parsed.data.source,
    state: normalizeAnalyticsConsentState(parsed.data.status) as Exclude<AnalyticsConsentState, 'unknown'>,
  })

  const snapshot = await readAnalyticsConsentSnapshot(db, {
    anonymousId,
    host: context.host,
    surface: context.surface,
  })

  return jsonResponse(snapshot, request)
}
