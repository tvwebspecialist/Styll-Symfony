import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { LocationsClient } from './locations-client'

export const dynamic = 'force-dynamic'

export default async function LocationsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const data = await fetchSymfonyAdminJson<Array<{
    id: string
    name: string
    address: string | null
    city: string | null
    zip_code: string | null
    phone: string | null
    email: string | null
    is_active: boolean
  }>>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/locations`)

  return <LocationsClient tenantId={tenantId} initial={data ?? []} />
}
