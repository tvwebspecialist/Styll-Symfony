import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VenditeTabs } from '@/components/dashboard/vendite/VenditeTabs'

export const dynamic = 'force-dynamic'

export default async function VenditePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()
  const { data: staff } = await db
    .from('staff_members')
    .select('tenant_id')
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const tenantId = staff?.tenant_id
  if (!tenantId) redirect('/onboarding/step-1')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <VenditeTabs tenantId={tenantId} />
      </Suspense>
    </div>
  )
}
