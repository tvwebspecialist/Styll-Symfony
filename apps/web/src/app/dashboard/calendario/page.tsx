import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { getCalendarioData } from '@/lib/actions/calendario'
import { getWeekMonday } from '@/lib/utils/week'
import { CalendarioClient } from '@/components/dashboard/calendario/CalendarioClient'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const weekParam = typeof params.week === 'string' ? params.week : null
  const dayParam  = typeof params.day  === 'string' ? params.day  : null
  const staffParam = typeof params.staff === 'string' ? params.staff : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenantId = await getActiveTenantId()
  if (!tenantId) redirect('/onboarding/step-1')

  const db = createAdminClient()
  const { data: myStaff } = await db
    .from('staff_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  const isManagerOrOwner = ['owner', 'manager'].includes(myStaff?.role ?? '')
  // When in day view, use the day itself as the week start so we load that week's data
  const weekStart = getWeekMonday(dayParam ?? weekParam)

  // Non-manager/owner staff can only see their own appointments
  const selectedStaffId = staffParam ?? (isManagerOrOwner ? null : (myStaff?.id ?? null))

  const data = await getCalendarioData(tenantId, weekStart, selectedStaffId)

  return (
    <CalendarioClient
      tenantId={tenantId}
      weekStart={weekStart}
      dayView={dayParam}
      data={data}
      currentStaffId={myStaff?.id ?? null}
      isManagerOrOwner={isManagerOrOwner}
      selectedStaffId={selectedStaffId}
    />
  )
}
