import { createAdminClient } from '@/lib/supabase/admin'
import { requireSuperadmin } from '@/app/admin/actions'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { AdminAnalyticsClient } from './analytics-client'

export const dynamic = 'force-dynamic'

interface TenantTrafficRow {
  tenant_id: string
  business_name: string
  slug: string
  total_sessions: number
  total_booking_completed: number
  avg_conversion_rate: number
  days_with_data: number
}

interface TenantHealthRow {
  tenant_id: string
  business_name: string
  slug: string
  last_login_at: string | null
  appointments_this_month: number
  active_clients_count: number
}

interface DailyRawRow {
  tenant_id: string
  sessions: number
  booking_completed: number
  conversion_rate: number
  day: string
}

interface HealthRawRow {
  tenant_id: string
  last_login_at: string | null
  appointments_this_month: number
  active_clients_count: number
}

interface TenantNameRow {
  id: string
  business_name: string
  slug: string
}

type AnyQueryResult<T> = Promise<{ data: T[] | null; error: unknown }>

type UntypedDb = {
  from(table: string): {
    select(cols: string): {
      gte(col: string, val: string): AnyQueryResult<DailyRawRow>
      in(col: string, vals: string[]): AnyQueryResult<TenantNameRow>
      order(col: string, opts: { ascending: boolean }): {
        limit(n: number): AnyQueryResult<HealthRawRow>
      }
    }
  }
}

async function getAdminAnalyticsData() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const db = createAdminClient() as unknown as UntypedDb

  const { data: dailyRaw } = await db
    .from('site_analytics_daily')
    .select('tenant_id,sessions,booking_completed,conversion_rate,day')
    .gte('day', since)

  const tenantMap = new Map<string, { sessions: number; booking_completed: number; conversion_sum: number; days: number }>()
  for (const row of dailyRaw ?? []) {
    const existing = tenantMap.get(row.tenant_id) ?? { sessions: 0, booking_completed: 0, conversion_sum: 0, days: 0 }
    tenantMap.set(row.tenant_id, {
      sessions: existing.sessions + row.sessions,
      booking_completed: existing.booking_completed + row.booking_completed,
      conversion_sum: existing.conversion_sum + row.conversion_rate,
      days: existing.days + 1,
    })
  }

  const tenantIds = Array.from(tenantMap.keys())
  const tenantNames: Record<string, { business_name: string; slug: string }> = {}

  if (tenantIds.length > 0) {
    const { data: tenants } = await db
      .from('tenants')
      .select('id,business_name,slug')
      .in('id', tenantIds)
    for (const t of tenants ?? []) {
      tenantNames[t.id] = { business_name: t.business_name, slug: t.slug }
    }
  }

  const trafficRows: TenantTrafficRow[] = []
  for (const [tenantId, agg] of tenantMap.entries()) {
    const info = tenantNames[tenantId]
    if (!info) continue
    trafficRows.push({
      tenant_id: tenantId,
      business_name: info.business_name,
      slug: info.slug,
      total_sessions: agg.sessions,
      total_booking_completed: agg.booking_completed,
      avg_conversion_rate: agg.days > 0 ? agg.conversion_sum / agg.days : 0,
      days_with_data: agg.days,
    })
  }
  trafficRows.sort((a, b) => b.total_sessions - a.total_sessions)

  const { data: healthRaw } = await db
    .from('tenant_activity_log')
    .select('tenant_id,last_login_at,appointments_this_month,active_clients_count')
    .order('last_login_at', { ascending: true })
    .limit(50)

  const healthTenantIds = (healthRaw ?? []).map((r) => r.tenant_id)
  const healthTenantNames: Record<string, { business_name: string; slug: string }> = {}
  if (healthTenantIds.length > 0) {
    const { data: ht } = await db
      .from('tenants')
      .select('id,business_name,slug')
      .in('id', healthTenantIds)
    for (const t of ht ?? []) {
      healthTenantNames[t.id] = { business_name: t.business_name, slug: t.slug }
    }
  }

  const healthRows: TenantHealthRow[] = (healthRaw ?? [])
    .map((r) => {
      const info = healthTenantNames[r.tenant_id]
      if (!info) return null
      return {
        tenant_id: r.tenant_id,
        business_name: info.business_name,
        slug: info.slug,
        last_login_at: r.last_login_at,
        appointments_this_month: r.appointments_this_month ?? 0,
        active_clients_count: r.active_clients_count ?? 0,
      }
    })
    .filter((r): r is TenantHealthRow => r !== null)

  return { trafficRows, healthRows }
}

export default async function AdminAnalyticsPage() {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return <p>Accesso negato.</p>
  }

  const { trafficRows, healthRows } = await getAdminAnalyticsData()

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Analytics' }]} />
      <AdminAnalyticsClient trafficRows={trafficRows} healthRows={healthRows} />
    </div>
  )
}
