import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { TenantsClient, type TenantRow } from './tenants-client'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const db = createAdminClient()
  const { data: tenants } = await db
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  const list = tenants ?? []
  const ids = list.map((t) => t.id)

  type CountMap = Record<string, number>
  const empty: CountMap = {}

  async function countBy(table: string): Promise<CountMap> {
    if (ids.length === 0) return empty
    const { data } = await db
      .from(table)
      .select('tenant_id')
      .in('tenant_id', ids)
    const map: CountMap = {}
    for (const r of (data ?? []) as Array<{ tenant_id: string }>) {
      map[r.tenant_id] = (map[r.tenant_id] ?? 0) + 1
    }
    return map
  }

  const [services, staff, locations] = await Promise.all([
    countBy('services'),
    countBy('staff_members'),
    countBy('locations'),
  ])

  let plansMap: Record<string, { plan_name: string | null; status: string | null }> = {}
  if (ids.length > 0) {
    const { data: subs } = await db
      .from('tenant_subscriptions')
      .select('tenant_id, status, plan:subscription_plans(name)')
      .in('tenant_id', ids)
    plansMap = {}
    for (const r of (subs ?? []) as Array<{
      tenant_id: string
      status: string | null
      plan: { name: string } | { name: string }[] | null
    }>) {
      const p = Array.isArray(r.plan) ? r.plan[0] : r.plan
      plansMap[r.tenant_id] = { plan_name: p?.name ?? null, status: r.status ?? null }
    }
  }

  const rows: TenantRow[] = list.map((t) => ({
    id: t.id,
    business_name: t.business_name,
    slug: t.slug,
    status: t.status,
    timezone: t.timezone,
    primary_color: t.primary_color,
    secondary_color: t.secondary_color,
    logo_url: t.logo_url,
    font_family: t.font_family,
    settings: t.settings,
    created_at: t.created_at,
    services_count: services[t.id] ?? 0,
    staff_count: staff[t.id] ?? 0,
    locations_count: locations[t.id] ?? 0,
    plan_name: plansMap[t.id]?.plan_name ?? null,
    subscription_status: plansMap[t.id]?.status ?? null,
  }))

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Tenants' }]} />
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Gestisci tutti gli account business della piattaforma.
        </p>
      </div>
      <TenantsClient initialTenants={rows} />
    </div>
  )
}
