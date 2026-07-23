import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getTenantOwnerInfo } from '@/app/admin/actions'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import { OverviewClient } from './overview-client'
import { TenantOwnerCard } from './tenant-owner-card'

export const dynamic = 'force-dynamic'

export default async function TenantOverviewPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  let tenant: {
    id: string
    business_name: string
    slug: string
    timezone: string
    status: string
    primary_color: string | null
    secondary_color: string | null
    logo_url: string | null
    font_family: string | null
    settings: Record<string, unknown> | null
    created_at: string
    updated_at: string
    subscription: {
      status: string | null
      current_period_start: string | null
      current_period_end: string | null
      plan_name: string | null
      price_monthly: number | null
    }
  }

  try {
    tenant = await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}`)
  } catch (error) {
    if (error instanceof SymfonyAdminApiError && error.details.status === 404) {
      notFound()
    }
    throw error
  }

  const [ownerRes] = await Promise.all([
    getTenantOwnerInfo(tenantId),
  ])
  const owner = ownerRes.success ? ownerRes.data ?? null : null

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <OverviewClient
          tenant={{
            id: tenant.id,
            business_name: tenant.business_name,
            slug: tenant.slug,
            timezone: tenant.timezone,
            status: tenant.status,
            primary_color: tenant.primary_color,
            secondary_color: tenant.secondary_color,
            logo_url: tenant.logo_url,
            font_family: tenant.font_family,
            settings: (tenant.settings as Record<string, unknown> | null) ?? {},
          }}
        />
      </div>

      <div className="flex flex-col gap-4">
        <TenantOwnerCard tenantId={tenantId} owner={owner} />

        <div className="rounded-2xl border bg-white p-5 shadow-sm ">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Abbonamento</h2>
            <Link
              href={`/admin/tenants/${tenantId}/subscription`}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Gestisci →
            </Link>
          </div>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Piano" value={tenant.subscription?.plan_name ?? '—'} />
            <Row
              label="Prezzo"
              value={tenant.subscription?.price_monthly != null ? `€ ${Number(tenant.subscription.price_monthly).toFixed(2)} / mese` : '—'}
            />
            <Row label="Stato" value={tenant.subscription?.status ?? '—'} />
            <Row
              label="Periodo dal"
              value={
                tenant.subscription?.current_period_start
                  ? new Date(tenant.subscription.current_period_start).toLocaleDateString('it-IT')
                  : '—'
              }
            />
            <Row
              label="Periodo al"
              value={
                tenant.subscription?.current_period_end
                  ? new Date(tenant.subscription.current_period_end).toLocaleDateString('it-IT')
                  : '—'
              }
            />
          </dl>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm ">
          <h2 className="text-sm font-semibold">Metadati</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="ID" value={<span className="font-mono text-xs">{tenant.id}</span>} />
            <Row
              label="Creato"
              value={new Date(tenant.created_at).toLocaleString('it-IT')}
            />
            <Row
              label="Aggiornato"
              value={new Date(tenant.updated_at).toLocaleString('it-IT')}
            />
          </dl>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b py-1.5 last:border-b-0 ">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm">{value}</dd>
    </div>
  )
}
