import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getActiveTenantId } from '@/lib/tenant-context'
import { VenditeTabs } from '@/components/dashboard/vendite/VenditeTabs'
import { requireTenantPermission, TENANT_PERMISSIONS } from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function VenditePage() {
  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/onboarding/step-1')
  await requireTenantPermission(TENANT_PERMISSIONS.VIEW_SALES, tenantId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <VenditeTabs tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
