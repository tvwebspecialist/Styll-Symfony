import { notFound } from 'next/navigation'

import { createAdminClient } from '@/lib/supabase/admin'
import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { TenantTabs } from './tenant-tabs'
import { TenantHeaderActions } from './tenant-header-actions'

export const dynamic = 'force-dynamic'

const TABS = [
  { href: '', label: 'Panoramica' },
  { href: '/services', label: 'Servizi' },
  { href: '/staff', label: 'Staff' },
  { href: '/locations', label: 'Sedi' },
  { href: '/working-hours', label: 'Orari' },
  { href: '/clients', label: 'Clienti' },
  { href: '/migration', label: 'Migrazione' },
  { href: '/appointments', label: 'Appuntamenti' },
  { href: '/subscription', label: 'Abbonamento' },
  { href: '/audit', label: 'Audit Log' },
]

const STATUS_BADGE: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-amber-100 text-amber-700',
  deleted: 'bg-red-100 text-red-700',
  inactive: 'bg-zinc-100 text-zinc-700  ',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Attivo',
  suspended: 'Sospeso',
  deleted: 'Eliminato',
  inactive: 'Inattivo',
}

export default async function TenantDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('id, business_name, slug, status, created_at, primary_color, logo_url')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenant) notFound()

  const [
    { count: servicesCount },
    { count: staffCount },
    { count: locationsCount },
    { count: clientsCount },
    { count: appointmentsCount },
  ] = await Promise.all([
    db.from('services').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('staff_members').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('locations').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db.from('clients').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  const statusKey = String(tenant.status ?? '').toLowerCase()
  const statusCls = STATUS_BADGE[statusKey] ?? STATUS_BADGE.inactive
  const statusLabel = STATUS_LABEL[statusKey] ?? tenant.status ?? '—'

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.business_name },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt=""
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-xl font-semibold text-white"
              style={{ backgroundColor: tenant.primary_color || '#71717a' }}
            >
              {tenant.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                {tenant.business_name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${statusCls}`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{tenant.slug}</span>
              <span>·</span>
              <span>creato il {new Date(tenant.created_at).toLocaleDateString('it-IT')}</span>
            </div>
          </div>
        </div>
        <TenantHeaderActions
          tenantId={tenant.id}
          tenantName={tenant.business_name}
          tenantSlug={tenant.slug}
          status={tenant.status}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Clienti" value={clientsCount ?? 0} />
        <StatCard label="Appuntamenti" value={appointmentsCount ?? 0} />
        <StatCard label="Servizi attivi" value={servicesCount ?? 0} />
        <StatCard label="Staff" value={staffCount ?? 0} />
      </div>

      <div className="hidden text-xs text-muted-foreground md:flex md:items-center md:gap-3">
        <span>Sedi: <strong className="text-foreground">{locationsCount ?? 0}</strong></span>
      </div>

      <TenantTabs tenantId={tenantId} tabs={TABS} />

      <div>{children}</div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-5 ">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  )
}
