import { Breadcrumbs } from '@/components/admin/breadcrumbs'
import { listPlanOptions } from '@/app/admin/actions'
import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { TenantsClient, type TenantRow } from './tenants-client'

export const dynamic = 'force-dynamic'

export default async function TenantsPage() {
  const [rows, plans] = await Promise.all([
    fetchSymfonyAdminJson<TenantRow[]>('/api/admin/tenants'),
    listPlanOptions(),
  ])

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: 'var(--font-primary)' }}>
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Barbieri' }]} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--admin-text)' }}>Barbieri</h1>
        <p className="text-sm" style={{ color: 'var(--admin-text-muted)' }}>
          Gestisci tutti gli account business della piattaforma.
        </p>
      </div>
      <TenantsClient initialTenants={rows} plans={plans} />
    </div>
  )
}
