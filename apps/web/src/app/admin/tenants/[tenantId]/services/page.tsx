import { createAdminClient } from '@/lib/supabase/admin'
import { ServicesClient } from './services-client'

export const dynamic = 'force-dynamic'

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()
  const { data } = await db
    .from('services')
    .select('id, name, description, price, duration_minutes, category, display_order, is_active')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })

  return <ServicesClient tenantId={tenantId} initial={data ?? []} />
}
