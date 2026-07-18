import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
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

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()
  const ctx = await getTenantRoleContext(tenant.tenant_id)
  if (!ctx || !hasTenantRole(ctx.role, INBOX_TENANT_ROLES)) {
    throwForbidden()
  }
  const canManageMarketing = hasTenantPermission(ctx.role, TENANT_PERMISSIONS.MANAGE_MARKETING)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <MarketingTabs
          tenantId={tenant.tenant_id}
          allowedTabs={canManageMarketing ? undefined : ['messaggi']}
          defaultTab={canManageMarketing ? undefined : 'messaggi'}
          inboxOnly={!canManageMarketing}
        />
      </Suspense>
    </div>
  )
}
