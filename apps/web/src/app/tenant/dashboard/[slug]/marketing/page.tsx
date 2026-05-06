import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { MarketingTabs } from '@/components/dashboard/marketing/MarketingTabs'

export const dynamic = 'force-dynamic'

export default async function MarketingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/onboarding/step-1')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <MarketingTabs tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
