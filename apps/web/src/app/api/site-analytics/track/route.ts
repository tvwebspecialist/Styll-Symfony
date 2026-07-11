import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ANALYTICS_CONSENT_ANON_COOKIE } from '@/lib/analytics-consent'
import {
  buildAnalyticsConsentRequestContext,
  readAnalyticsConsentSnapshot,
} from '@/lib/analytics-consent-server'
import type { SiteEventType, AppSurface } from '@/lib/site-analytics/track'

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it').trim().replace(/^\./, '')
const ROOT_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim()
const BLOCKED_HOSTS = new Set(['www', 'admin'])
const SENSITIVE_KEY_RE = /(token|secret|password|auth|authorization|cookie|session|jwt|code|key)/i

// TODO: replace with Redis-backed rate limiter when app runs on multiple serverless instances.
// Current in-memory map resets on cold start — acceptable for single-instance deploys.
const rateBucket = new Map<string, number>()
const RATE_WINDOW_MS = 2_000
const RATE_BUCKET_MAX = 5_000

function isRateLimited(anonymousId: string): boolean {
  const now = Date.now()
  const last = rateBucket.get(anonymousId)
  if (last !== undefined && now - last < RATE_WINDOW_MS) return true
  rateBucket.set(anonymousId, now)
  if (rateBucket.size > RATE_BUCKET_MAX) {
    for (const [k, v] of rateBucket) {
      if (now - v > RATE_WINDOW_MS * 10) rateBucket.delete(k)
      if (rateBucket.size < RATE_BUCKET_MAX / 2) break
    }
  }
  return false
}

const VALID_EVENTS = new Set<string>([
  'page_view', 'service_view', 'booking_started',
  'booking_completed', 'signup_completed', 'login',
])

const VALID_SURFACES = new Set<string>(['website', 'pwa'])

interface TrackPayload {
  tenant_id?: string
  anonymous_id: string
  event_type: string
  app_surface: string
  page_url?: string
  referrer?: string | null
  user_agent?: string
  metadata?: Record<string, unknown>
}

interface SessionRow { id: string }
interface SessionUpsertData {
  tenant_id: string
  anonymous_id: string
  app_surface: AppSurface
  last_seen_at: string
  landing_page?: string | null
  referrer?: string | null
  device_type?: 'mobile' | 'desktop'
}
interface EventInsertData {
  tenant_id: string
  session_id: string
  event_type: string
  page_path: string | null
}

type AnalyticsDb = {
  from(table: 'site_sessions'): {
    select(cols: string): {
      eq(col: string, value: string): {
        eq(col: string, value: string): {
          limit(count: number): Promise<{ data: Array<SessionRow & { app_surface?: string | null }> | null; error: { message: string } | null }>
        }
      }
    }
    update(data: SessionUpsertData): {
      eq(col: string, value: string): Promise<{ error: { message: string } | null }>
    }
    insert(data: SessionUpsertData): {
      select(cols: string): {
        maybeSingle(): Promise<{ data: SessionRow | null; error: { message: string } | null }>
      }
    }
  }
  from(table: 'tenants'): {
    select(cols: string): {
      eq(col: string, value: string): {
        eq(col: string, value: string): {
          maybeSingle(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
        }
      }
    }
  }
  from(table: 'site_events'): {
    insert(data: EventInsertData): Promise<{ error: { message: string } | null }>
  }
}

type DerivedContext = {
  slug: string
  appSurface: AppSurface
}

function firstHeaderValue(value: string | null): string | null {
  return value?.split(',')[0]?.trim() || null
}

function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url
  } catch {
    return null
  }
}

function normalizePagePath(raw: string | null | undefined): string | null {
  if (!raw) return null

  try {
    if (raw.startsWith('/')) {
      const url = new URL(raw, `${ROOT_APP_ORIGIN.replace(/\/$/, '')}/`)
      return url.pathname
    }

    const url = new URL(raw)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.pathname
  } catch {
    return null
  }
}

function sanitizeReferrer(raw: string | null | undefined): string | null {
  const url = parseHttpUrl(raw)
  if (!url) return null
  return `${url.origin}${url.pathname}`
}

function detectDeviceType(userAgent: string | null | undefined): 'mobile' | 'desktop' {
  const ua = (userAgent ?? '').toLowerCase()
  return /android|iphone|ipad|mobile/.test(ua) ? 'mobile' : 'desktop'
}

function deriveContextFromHost(hostValue: string | null): DerivedContext | null {
  const host = firstHeaderValue(hostValue)?.toLowerCase()
  if (!host) return null

  let subdomain: string | null = null

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    subdomain = host.slice(0, -(ROOT_DOMAIN.length + 1))
  } else {
    const localhostMatch = host.match(/^(.+)\.localhost(?::\d+)?$/i)
    subdomain = localhostMatch?.[1] ?? null
  }

  if (!subdomain || BLOCKED_HOSTS.has(subdomain)) return null
  if (subdomain.endsWith('-dashboard')) return null
  if (subdomain.endsWith('-app')) {
    const slug = subdomain.slice(0, -'-app'.length)
    return slug ? { slug, appSurface: 'pwa' } : null
  }

  return { slug: subdomain, appSurface: 'website' }
}

function deriveContextFromPath(pathname: string | null): DerivedContext | null {
  if (!pathname) return null
  const match = pathname.match(/^\/tenant\/(app|landing)\/([^/?#]+)/)
  if (!match?.[1] || !match[2]) return null

  return {
    slug: decodeURIComponent(match[2]),
    appSurface: match[1] === 'app' ? 'pwa' : 'website',
  }
}

function sameContext(left: DerivedContext, right: DerivedContext): boolean {
  return left.slug === right.slug && left.appSurface === right.appSurface
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (depth > 2) return null
  if (value == null) return null
  if (typeof value === 'string') return value.slice(0, 200)
  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeMetadataValue(item, depth + 1))
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !SENSITIVE_KEY_RE.test(key))
      .slice(0, 20)
      .map(([key, nested]) => [key, sanitizeMetadataValue(nested, depth + 1)])
      .filter(([, nested]) => nested !== undefined)

    return Object.fromEntries(entries)
  }

  return null
}

function sanitizeMetadata(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const sanitized = sanitizeMetadataValue(raw, 0)
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) return {}

  try {
    return JSON.stringify(sanitized).length <= 2_000
      ? sanitized as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: TrackPayload
  try {
    body = (await req.json()) as TrackPayload
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { tenant_id, anonymous_id, event_type, app_surface, page_url, referrer, user_agent, metadata } = body
  const sanitizedMetadata = sanitizeMetadata(metadata)
  const refererUrl = parseHttpUrl(req.headers.get('referer'))
  const currentPagePath =
    normalizePagePath(refererUrl?.pathname ?? null) ??
    normalizePagePath(page_url)
  const sanitizedReferrer = sanitizeReferrer(referrer)

  if (!anonymous_id || !event_type || !app_surface) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!VALID_EVENTS.has(event_type)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!VALID_SURFACES.has(app_surface)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (isRateLimited(anonymous_id)) {
    return NextResponse.json({ ok: false, reason: 'rate_limited' }, { status: 429 })
  }

  try {
    const adminDb = createAdminClient()
    const db = adminDb as unknown as AnalyticsDb
    const contextCandidates = [
      deriveContextFromHost(req.headers.get('host')),
      deriveContextFromHost(req.headers.get('x-forwarded-host')),
      deriveContextFromHost(refererUrl?.host ?? null),
      deriveContextFromPath(refererUrl?.pathname ?? null),
      deriveContextFromPath(currentPagePath),
    ].filter((value): value is DerivedContext => value !== null)

    const derivedContext = contextCandidates[0] ?? null
    if (!derivedContext) {
      return NextResponse.json({ ok: false, reason: 'tenant_unresolvable' }, { status: 400 })
    }

    if (contextCandidates.some((candidate) => !sameContext(candidate, derivedContext))) {
      return NextResponse.json({ ok: false, reason: 'tenant_context_mismatch' }, { status: 403 })
    }

    if (app_surface !== derivedContext.appSurface) {
      return NextResponse.json({ ok: false, reason: 'surface_mismatch' }, { status: 403 })
    }

    const consentAnonymousId = req.cookies.get(ANALYTICS_CONSENT_ANON_COOKIE)?.value ?? null
    if (!consentAnonymousId || consentAnonymousId !== anonymous_id) {
      return NextResponse.json({ ok: false, reason: 'analytics_consent_required' }, { status: 403 })
    }

    const consentContext = buildAnalyticsConsentRequestContext(
      req.headers,
      currentPagePath ?? refererUrl?.pathname ?? '/',
      { app_surface },
    )
    const consentSnapshot = await readAnalyticsConsentSnapshot(adminDb, {
      anonymousId: anonymous_id,
      host: consentContext.host,
    })
    if (consentSnapshot.state !== 'accepted') {
      return NextResponse.json({ ok: false, reason: 'analytics_consent_required' }, { status: 403 })
    }

    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('id')
      .eq('slug', derivedContext.slug)
      .eq('status', 'active')
      .maybeSingle()

    if (tenantError || !tenant?.id) {
      return NextResponse.json({ ok: false, reason: 'tenant_not_found' }, { status: 400 })
    }

    if (tenant_id && tenant_id !== tenant.id) {
      return NextResponse.json({ ok: false, reason: 'tenant_id_mismatch' }, { status: 403 })
    }

    const now = new Date().toISOString()
    const sessionPayload: SessionUpsertData = {
      tenant_id: tenant.id,
      anonymous_id,
      app_surface: derivedContext.appSurface,
      last_seen_at: now,
      landing_page: currentPagePath,
      referrer: sanitizedReferrer,
      device_type: detectDeviceType(user_agent),
    }

    const { data: existingSessions, error: existingSessionsError } = await db
      .from('site_sessions')
      .select('id, app_surface')
      .eq('tenant_id', tenant.id)
      .eq('anonymous_id', anonymous_id)
      .limit(5)

    if (existingSessionsError) {
      console.error('[site-analytics] session lookup error', existingSessionsError.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    const existingSession =
      (existingSessions ?? []).find((row) => row.app_surface === derivedContext.appSurface)
      ?? (existingSessions ?? [])[0]

    let session: SessionRow | null = null
    let sessionError: { message: string } | null = null

    if (existingSession?.id) {
      const updateResult = await db
        .from('site_sessions')
        .update(sessionPayload)
        .eq('id', existingSession.id)

      sessionError = updateResult.error
      session = sessionError ? null : { id: existingSession.id }
    } else {
      ({ data: session, error: sessionError } = await db
        .from('site_sessions')
        .insert(sessionPayload)
        .select('id')
        .maybeSingle())
    }

    if (sessionError || !session?.id) {
      console.error('[site-analytics] session upsert error', sessionError?.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    const { error: eventError } = await db.from('site_events').insert({
      tenant_id: tenant.id,
      session_id: session.id,
      event_type: event_type as SiteEventType,
      page_path: currentPagePath,
    })

    if (eventError) {
      console.error('[site-analytics] event insert error', eventError.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }

    void sanitizedMetadata
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[site-analytics] unexpected error', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
