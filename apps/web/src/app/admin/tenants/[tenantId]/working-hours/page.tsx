import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { WorkingHoursClient } from './working-hours-client'

export const dynamic = 'force-dynamic'

export default async function WorkingHoursPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const data = await fetchSymfonyAdminJson<{
    staff: Array<{ id: string; profile?: { full_name: string | null; email: string | null } | null }>
    hours: Array<{ staff_id: string; day_of_week: number; start_time: string; end_time: string }>
  }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/working-hours`)

  return (
    <WorkingHoursClient
      tenantId={tenantId}
      staff={data.staff as never}
      hours={data.hours as never}
    />
  )
}
