import { requireSuperadmin } from '@/app/admin/actions'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import type { SiteAnalyticsDailyRow } from '@/lib/site-analytics/daily'
import { notFound } from 'next/navigation'
import { TenantAnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

// ── DB types ────────────────────────────────────────────────────

interface TenantAnalyticsResponse {
  tenant_name: string
  tenant_slug: string
  period: number
  website_daily: SiteAnalyticsDailyRow[]
  pwa_daily: SiteAnalyticsDailyRow[]
  last_login_at: string | null
  appointments_in_period: number
}

// ── Period helpers ───────────────────────────────────────────────

const VALID_PERIODS = [7, 30, 90] as const
type ValidPeriod = (typeof VALID_PERIODS)[number]

function parsePeriod(raw: string | string[] | undefined): ValidPeriod {
  const n = parseInt(typeof raw === 'string' ? raw : '30', 10)
  return (VALID_PERIODS.includes(n as ValidPeriod) ? n : 30) as ValidPeriod
}

// ── Page ────────────────────────────────────────────────────────

interface PageProps {
  params: Promise<{ tenantId: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function TenantAnalyticsPage({ params, searchParams }: PageProps) {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return <p className="text-sm" style={{ color: 'var(--admin-accent)' }}>Accesso negato.</p>
  }

  const { tenantId } = await params
  const sp = await searchParams
  const period = parsePeriod(sp.days)

  let analytics: TenantAnalyticsResponse
  try {
    analytics = await fetchSymfonyAdminJson<TenantAnalyticsResponse>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/analytics?days=${encodeURIComponent(String(period))}`,
    )
  } catch (error) {
    if (error instanceof SymfonyAdminApiError && error.details.status === 404) {
      notFound()
    }
    throw error
  }

  return (
    <TenantAnalyticsClient
      tenantName={analytics.tenant_name}
      period={period}
      websiteDaily={analytics.website_daily}
      pwaDaily={analytics.pwa_daily}
      lastLoginAt={analytics.last_login_at}
      appointmentsInPeriod={analytics.appointments_in_period}
    />
  )
}
