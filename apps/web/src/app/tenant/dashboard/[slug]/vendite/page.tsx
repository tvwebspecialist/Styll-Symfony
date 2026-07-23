import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { VenditeTabs } from '@/components/dashboard/vendite/VenditeTabs'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'
import { getOptionalSymfonyStaffMe } from '@/lib/symfony/staff-context'

export const dynamic = 'force-dynamic'

export default async function VenditePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const me = await getOptionalSymfonyStaffMe(slug)
  const tenantId = me?.currentTenant?.tenant.id
  if (!tenantId) notFound()
  await requireTenantPermission(TENANT_PERMISSIONS.VIEW_SALES, tenantId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <VenditeTabs tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
