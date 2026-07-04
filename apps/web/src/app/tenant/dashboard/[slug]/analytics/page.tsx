import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  fetchSiteAnalyticsDailyRows,
  type SiteAnalyticsDailyRow,
  type SiteAnalyticsDb,
} from '@/lib/site-analytics/daily'
import { getTenantBySlug } from '@/lib/tenant'
import { SiteAnalyticsClient } from '@/components/dashboard/analytics/SiteAnalyticsClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

interface DailyRow {
  date: string
  sessions: number
  page_views: number
  unique_visitors: number
  booking_started: number
  booking_completed: number
  conversion_rate: number
  new_signups: number
  mobile_sessions: number
  desktop_sessions: number
}

function combineDailyRows(rows: SiteAnalyticsDailyRow[]): DailyRow[] {
  const byDate = new Map<string, DailyRow>()

  for (const row of rows) {
    const existing = byDate.get(row.date)

    if (!existing) {
      byDate.set(row.date, {
        date: row.date,
        sessions: row.sessions,
        page_views: row.page_views,
        unique_visitors: row.unique_visitors,
        booking_started: row.booking_started,
        booking_completed: row.booking_completed,
        conversion_rate: row.conversion_rate,
        new_signups: row.new_signups,
        mobile_sessions: row.mobile_sessions,
        desktop_sessions: row.desktop_sessions,
      })
      continue
    }

    existing.sessions += row.sessions
    existing.page_views += row.page_views
    existing.unique_visitors += row.unique_visitors
    existing.booking_started += row.booking_started
    existing.booking_completed += row.booking_completed
    existing.new_signups += row.new_signups
    existing.mobile_sessions += row.mobile_sessions
    existing.desktop_sessions += row.desktop_sessions
    existing.conversion_rate =
      existing.booking_started > 0 ? existing.booking_completed / existing.booking_started : 0
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

async function getAnalyticsData(tenantId: string) {
  const db = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const daily = combineDailyRows(
    await fetchSiteAnalyticsDailyRows(db as unknown as SiteAnalyticsDb, {
      context: 'tenant dashboard analytics',
      tenantId,
      since,
    }),
  )

  // Quick wins from existing appointments table
  const { data: bookingSourceRaw } = await db
    .from('appointments')
    .select('booking_source')
    .eq('tenant_id', tenantId)
    .not('booking_source', 'is', null)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const sourceCounts: Record<string, number> = {}
  for (const row of bookingSourceRaw ?? []) {
    const src = (row as { booking_source: string }).booking_source ?? 'unknown'
    sourceCounts[src] = (sourceCounts[src] ?? 0) + 1
  }
  const bookingSources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // Client account ratio
  const { count: totalClients } = await db
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const { count: clientsWithAccount } = await db
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .not('profile_id', 'is', null)

  return {
    daily,
    bookingSources,
    totalClients: totalClients ?? 0,
    clientsWithAccount: clientsWithAccount ?? 0,
  }
}

export default async function AnalyticsPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()

  const data = await getAnalyticsData(tenant.tenant_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SiteAnalyticsClient
        tenantId={tenant.tenant_id}
        daily={data.daily}
        bookingSources={data.bookingSources}
        totalClients={data.totalClients}
        clientsWithAccount={data.clientsWithAccount}
      />
    </div>
  )
}
