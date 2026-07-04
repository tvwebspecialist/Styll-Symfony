import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { SiteAnalyticsClient } from '@/components/dashboard/analytics/SiteAnalyticsClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

interface DailyRow {
  day: string
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

interface BookingSourceRow {
  booking_source: string
  count: number
}

interface ClientStatsRow {
  total: number
  with_account: number
}

type AnalyticsDb = {
  from(table: 'site_analytics_daily'): {
    select(cols: string): {
      eq(col: string, val: string): {
        gte(col: string, val: string): {
          order(col: string, opts: { ascending: boolean }): Promise<{ data: DailyRow[] | null }>
        }
      }
    }
  }
  rpc(fn: 'get_booking_source_breakdown', params: { p_tenant_id: string; p_days: number }): Promise<{ data: BookingSourceRow[] | null }>
}

async function getAnalyticsData(tenantId: string) {
  const db = createAdminClient()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: daily } = await (db as unknown as AnalyticsDb)
    .from('site_analytics_daily')
    .select('day,sessions,page_views,unique_visitors,booking_started,booking_completed,conversion_rate,new_signups,mobile_sessions,desktop_sessions')
    .eq('tenant_id', tenantId)
    .gte('day', since)
    .order('day', { ascending: true })

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
    daily: (daily ?? []) as DailyRow[],
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
