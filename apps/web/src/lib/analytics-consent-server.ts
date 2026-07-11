import 'server-only'
import { randomUUID } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, Tables, TablesInsert } from '@/types'
import {
  ANALYTICS_CONSENT_POLICY_VERSION,
  ANALYTICS_CONSENT_SOURCE,
  ANALYTICS_CONSENT_SURFACE,
  type AnalyticsConsentChoiceSource,
  type AnalyticsConsentSurface,
} from './analytics-consent-copy'
import type { AnalyticsConsentState, AnalyticsConsentSnapshot } from './analytics-consent-shared'
export type { AnalyticsConsentState, AnalyticsConsentSnapshot } from './analytics-consent-shared'
export { normalizeAnalyticsConsentState } from './analytics-consent-shared'

export const ANALYTICS_CONSENT_ANON_COOKIE = 'styll_analytics_anon_v1'
export const ANALYTICS_CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180

type ConsentDb = Pick<ReturnType<typeof createAdminClient>, 'from'>
type HeaderReader = { get(name: string): string | null }

export interface AnalyticsConsentRequestContext {
  host: string
  ipAddress: string | null
  metadata: Record<string, Json>
  pathname: string
  policyVersion: string
  surface: AnalyticsConsentSurface
  userAgent: string | null
}

function normalizeHost(raw: string | null): string {
  return (raw ?? '')
    .split(',')[0]
    ?.trim()
    .toLowerCase()
    .replace(/:\d+$/, '') || 'unknown'
}

function normalizePathname(raw: string | null | undefined): string {
  if (!raw) return '/'
  const trimmed = raw.trim()
  if (!trimmed) return '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function extractTenantSlugFromHost(host: string): string | null {
  const localhostMatch = host.match(/^(.+)\.localhost$/i)
  if (localhostMatch?.[1]) {
    return localhostMatch[1]
      .replace(/-app$/, '')
      .replace(/-dashboard$/, '')
      || null
  }

  const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()

  if (!host.endsWith(`.${rootDomain}`)) return null
  const subdomain = host.slice(0, -(rootDomain.length + 1))
  if (!subdomain || subdomain === 'www' || subdomain === 'admin') return null

  return subdomain
    .replace(/-app$/, '')
    .replace(/-dashboard$/, '')
    || null
}

function deriveAnalyticsSurface(host: string, pathname: string): AnalyticsConsentSurface {
  if (pathname.startsWith('/tenant/dashboard/')) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_DASHBOARD
  }
  if (pathname.startsWith('/tenant/app/')) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_PWA
  }
  if (pathname.startsWith('/tenant/landing/')) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_WEBSITE
  }
  if (host.includes('-dashboard.')) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_DASHBOARD
  }
  if (host.includes('-app.')) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_PWA
  }
  if (extractTenantSlugFromHost(host)) {
    return ANALYTICS_CONSENT_SURFACE.TENANT_WEBSITE
  }
  return ANALYTICS_CONSENT_SURFACE.PLATFORM
}

function sanitizeMetadata(
  input: Record<string, unknown> | undefined,
): Record<string, Json> {
  if (!input) return {}

  const entries = Object.entries(input)
    .slice(0, 20)
    .map(([key, value]) => {
      if (
        value === null
        || typeof value === 'string'
        || typeof value === 'number'
        || typeof value === 'boolean'
      ) {
        return [key, value as Json] as const
      }

      if (Array.isArray(value)) {
        return [key, value.slice(0, 20) as Json] as const
      }

      if (typeof value === 'object') {
        try {
          return [key, JSON.parse(JSON.stringify(value)) as Json] as const
        } catch {
          return [key, null] as const
        }
      }

      return [key, null] as const
    })

  return Object.fromEntries(entries)
}

export function createAnalyticsAnonymousId(): string {
  return randomUUID()
}

export function buildAnalyticsConsentRequestContext(
  headerStore: HeaderReader,
  pathname: string,
  metadata?: Record<string, unknown>,
): AnalyticsConsentRequestContext {
  const host = normalizeHost(headerStore.get('x-forwarded-host') ?? headerStore.get('host'))
  const normalizedPathname = normalizePathname(pathname)
  const tenantSlug =
    normalizedPathname.match(/^\/tenant\/(?:app|dashboard|landing)\/([^/?#]+)/)?.[1]
    ?? extractTenantSlugFromHost(host)
  const surface = deriveAnalyticsSurface(host, normalizedPathname)
  const ipAddress =
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim()
    || headerStore.get('x-real-ip')?.trim()
    || null
  const userAgent = headerStore.get('user-agent')?.trim() || null

  return {
    host,
    pathname: normalizedPathname,
    surface,
    policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
    ipAddress,
    userAgent,
    metadata: {
      ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
      pathname: normalizedPathname,
      ...sanitizeMetadata(metadata),
    },
  }
}

export async function readLatestAnalyticsConsentEvent(
  db: ConsentDb,
  {
    anonymousId,
    host,
    surface,
  }: {
    anonymousId: string
    host: string
    surface: AnalyticsConsentSurface
  },
): Promise<Tables<'analytics_consent_events'> | null> {
  const { data, error } = await db
    .from('analytics_consent_events')
    .select('*')
    .eq('anonymous_id', anonymousId)
    .eq('host', host)
    .eq('surface', surface)
    .order('occurred_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Errore lettura consenso analytics: ${error.message}`)
  }

  return (data as Tables<'analytics_consent_events'> | null) ?? null
}

export async function readAnalyticsConsentSnapshot(
  db: ConsentDb,
  {
    anonymousId,
    host,
    surface,
  }: {
    anonymousId: string | null
    host: string
    surface: AnalyticsConsentSurface
  },
): Promise<AnalyticsConsentSnapshot> {
  if (!anonymousId) {
    return {
      anonymousId: null,
      state: 'unknown',
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
      occurredAt: null,
      source: null,
      surface: null,
    }
  }

  const latest = await readLatestAnalyticsConsentEvent(db, { anonymousId, host, surface })
  if (!latest) {
    return {
      anonymousId,
      state: 'unknown',
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
      occurredAt: null,
      source: null,
      surface: null,
    }
  }

  if (latest.policy_version !== ANALYTICS_CONSENT_POLICY_VERSION) {
    return {
      anonymousId,
      state: 'unknown',
      policyVersion: ANALYTICS_CONSENT_POLICY_VERSION,
      occurredAt: latest.occurred_at,
      source: latest.source as AnalyticsConsentChoiceSource,
      surface: latest.surface as AnalyticsConsentSurface,
    }
  }

  return {
    anonymousId,
    state: latest.status as AnalyticsConsentState,
    policyVersion: latest.policy_version,
    occurredAt: latest.occurred_at,
    source: latest.source as AnalyticsConsentChoiceSource,
    surface: latest.surface as AnalyticsConsentSurface,
  }
}

export async function appendAnalyticsConsentEvent(
  db: ConsentDb,
  {
    anonymousId,
    context,
    source,
    state,
  }: {
    anonymousId: string
    context: AnalyticsConsentRequestContext
    source: AnalyticsConsentChoiceSource
    state: Exclude<AnalyticsConsentState, 'unknown'>
  },
): Promise<Tables<'analytics_consent_events'>> {
  const payload: TablesInsert<'analytics_consent_events'> = {
    anonymous_id: anonymousId,
    host: context.host,
    surface: context.surface,
    status: state,
    policy_version: context.policyVersion,
    occurred_at: new Date().toISOString(),
    ip_address: context.ipAddress,
    user_agent: context.userAgent,
    source,
    metadata: context.metadata,
  }

  const { data, error } = await db
    .from('analytics_consent_events')
    .insert(payload)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Errore scrittura consenso analytics: ${error?.message ?? 'record mancante'}`)
  }

  return data as Tables<'analytics_consent_events'>
}
