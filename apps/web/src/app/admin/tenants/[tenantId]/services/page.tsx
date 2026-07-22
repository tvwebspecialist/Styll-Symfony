import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { ServicesClient } from './services-client'

export const dynamic = 'force-dynamic'

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const data = await fetchSymfonyAdminJson<Array<{
    id: string
    name: string
    description: string | null
    price: number
    duration_minutes: number
    category: string | null
    display_order: number
    is_active: boolean
  }>>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/services`)

  return <ServicesClient tenantId={tenantId} initial={data ?? []} />
}
