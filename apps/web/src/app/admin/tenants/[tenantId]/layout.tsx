import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import { TenantTabs } from './tenant-tabs'
import { TenantHeaderActions } from './tenant-header-actions'

export const dynamic = 'force-dynamic'

const TABS = [
  { href: '', label: 'Panoramica' },
  { href: '/services', label: 'Servizi' },
  { href: '/products', label: 'Prodotti' },
  { href: '/staff', label: 'Staff' },
  { href: '/locations', label: 'Sedi' },
  { href: '/working-hours', label: 'Orari' },
  { href: '/clients', label: 'Clienti' },
  { href: '/migration', label: 'Migrazione' },
  { href: '/appointments', label: 'Appuntamenti' },
  { href: '/whatsapp', label: 'WhatsApp' },
  { href: '/subscription', label: 'Abbonamento' },
  { href: '/audit', label: 'Audit Log' },
  { href: '/analytics', label: 'Analytics' },
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
  let tenant: {
    id: string
    business_name: string
    slug: string
    status: string
    created_at: string
    primary_color: string | null
    logo_url: string | null
    services_count: number
    staff_count: number
    locations_count: number
    clients_count: number
    appointments_count: number
  }

  try {
    tenant = await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}`)
  } catch (error) {
    if (error instanceof SymfonyAdminApiError && error.details.status === 404) {
      notFound()
    }
    throw error
  }

  const statusKey = String(tenant.status ?? '').toLowerCase()
  const statusCls = STATUS_BADGE[statusKey] ?? STATUS_BADGE.inactive
  const statusLabel = STATUS_LABEL[statusKey] ?? tenant.status ?? '—'

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: 'var(--font-primary)' }}>
      <Breadcrumbs
        items={[
          { label: 'Admin', href: '/admin' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.business_name },
        ]}
      />

      {/* Header card */}
      <div
        className="admin-card flex flex-wrap items-start justify-between gap-4 p-5"
      >
        <div className="flex items-center gap-4">
          {tenant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenant.logo_url}
              alt=""
              className="h-14 w-14 rounded-xl object-cover"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl font-bold text-white"
              style={{ backgroundColor: tenant.primary_color || '#E94560' }}
            >
              {tenant.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>
                {tenant.business_name}
              </h1>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCls}`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              <span className="font-mono">{tenant.slug}</span>
              <span>·</span>
              <span>creato il {new Date(tenant.created_at).toLocaleDateString('it-IT')}</span>
              <span>·</span>
              <span>{tenant.locations_count ?? 0} {(tenant.locations_count ?? 0) === 1 ? 'sede' : 'sedi'}</span>
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

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Clienti" value={tenant.clients_count ?? 0} href={`/admin/tenants/${tenantId}/clients`} />
        <StatCard label="Appuntamenti" value={tenant.appointments_count ?? 0} href={`/admin/tenants/${tenantId}/appointments`} />
        <StatCard label="Servizi" value={tenant.services_count ?? 0} href={`/admin/tenants/${tenantId}/services`} />
        <StatCard label="Staff" value={tenant.staff_count ?? 0} href={`/admin/tenants/${tenantId}/staff`} />
      </div>

      <TenantTabs tenantId={tenantId} tabs={TABS} />

      <div>{children}</div>
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="admin-card block p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
    >
      <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--admin-text-subtle)' }}>
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold tabular-nums" style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}>
        {value}
      </div>
    </Link>
  )
}
