import { listTenantImportJobs } from '@/app/admin/actions'
import { TenantMigrationClient } from './migration-client'

export const dynamic = 'force-dynamic'

export default async function TenantMigrationPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const { data: jobs, error } = await listTenantImportJobs(tenantId)

  return (
    <TenantMigrationClient
      tenantId={tenantId}
      jobs={jobs ?? []}
      loadError={error ?? null}
    />
  )
}
