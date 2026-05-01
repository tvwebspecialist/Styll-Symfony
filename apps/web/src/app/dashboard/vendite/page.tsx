import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { VenditeTabs } from '@/components/dashboard/vendite/VenditeTabs'

export const dynamic = 'force-dynamic'

export default async function VenditePage() {
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
        <VenditeTabs tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
