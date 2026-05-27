import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { VenditeTabs } from '@/components/dashboard/vendite/VenditeTabs'

export const dynamic = 'force-dynamic'

export default async function VenditePage({
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Suspense>
        <VenditeTabs tenantId={tenant.tenant_id} />
      </Suspense>
    </div>
  )
}
