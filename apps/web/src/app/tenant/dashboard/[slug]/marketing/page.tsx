import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { MarketingTabs } from '@/components/dashboard/marketing/MarketingTabs'
import { requireOwnerManagerTenantContext } from '@/lib/tenant-role-guard'

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
  await requireOwnerManagerTenantContext(tenant.tenant_id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <MarketingTabs tenantId={tenant.tenant_id} />
      </Suspense>
    </div>
  )
}
