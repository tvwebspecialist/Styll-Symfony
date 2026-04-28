import { createAdminClient } from '@/lib/supabase/admin'
import { LocationsClient } from './locations-client'

export const dynamic = 'force-dynamic'

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()
  const { data } = await db
    .from('locations')
    .select('id, name, address, city, zip_code, phone, email, is_active')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  return <LocationsClient tenantId={tenantId} initial={data ?? []} />
}
