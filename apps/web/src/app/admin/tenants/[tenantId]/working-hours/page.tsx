import { createAdminClient } from '@/lib/supabase/admin'
import { WorkingHoursClient } from './working-hours-client'

export const dynamic = 'force-dynamic'

export default async function WorkingHoursPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()
  const [{ data: staff }, { data: hours }] = await Promise.all([
    db
      .from('staff_members')
      .select('id, profile:profiles(full_name, email)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    db
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('tenant_id', tenantId),
  ])

  return (
    <WorkingHoursClient
      tenantId={tenantId}
      staff={(staff ?? []) as never}
      hours={(hours ?? []) as never}
    />
  )
}
