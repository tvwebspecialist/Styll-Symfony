import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'

// ── Exported types ──────────────────────────────────────────────

export interface DailyPoint {
  date: string
  sessions: number
  page_views: number
  booking_completed: number
}

export interface TenantAnalyticsRow {
  tenant_id: string
  business_name: string
  slug: string
  sessions: number
  page_views: number
  booking_completed: number
  avg_conversion_rate: number
  days_with_data: number
  last_login_at: string | null
}

export interface PlatformSummary {
  total_sessions: number
  avg_conversion_rate: number
  top_tenant: { name: string; slug: string; sessions: number } | null
  at_risk_count: number
  prev_total_sessions: number
  prev_avg_conversion_rate: number
  mobile_sessions: number
  desktop_sessions: number
  median_sessions: number
  at_risk_threshold: number
}

export interface AdminSiteAnalyticsData {
  summary: PlatformSummary
  daily: DailyPoint[]
  tenants: TenantAnalyticsRow[]
  period_days: number
  insight_text: string
}

// ── Main export ─────────────────────────────────────────────────

export async function getAdminSiteAnalytics(periodDays: number): Promise<AdminSiteAnalyticsData> {
  return fetchSymfonyAdminJson<AdminSiteAnalyticsData>(
    `/api/admin/analytics?days=${encodeURIComponent(String(periodDays))}`,
  )
}
