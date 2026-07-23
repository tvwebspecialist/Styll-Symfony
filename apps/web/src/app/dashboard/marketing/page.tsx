import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getActiveTenantId } from '@/lib/tenant-context'
import { MarketingTabs } from '@/components/dashboard/marketing/MarketingTabs'
import {
  getTenantRoleContext,
  hasTenantPermission,
  hasTenantRole,
  INBOX_TENANT_ROLES,
  TENANT_PERMISSIONS,
  throwForbidden,
} from '@/lib/tenant-role-guard'

export const dynamic = 'force-dynamic'

export default async function MarketingPage() {
  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/onboarding/step-1')
  const ctx = await getTenantRoleContext(tenantId)
  if (!ctx || !hasTenantRole(ctx.role, INBOX_TENANT_ROLES)) {
    throwForbidden()
  }
  const canManageMarketing = hasTenantPermission(ctx.role, TENANT_PERMISSIONS.MANAGE_MARKETING)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <MarketingTabs
          tenantId={tenantId}
          allowedTabs={canManageMarketing ? undefined : ['messaggi']}
          defaultTab={canManageMarketing ? undefined : 'messaggi'}
          inboxOnly={!canManageMarketing}
        />
      </Suspense>
    </div>
  )
}
