import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { getCalendarioData } from '@/lib/actions/calendario'
import { getTenantTimezone } from '@/lib/actions/public-booking'
import { getWeekMonday } from '@/lib/utils/week'
import { CalendarioClient } from '@/components/dashboard/calendario/CalendarioClient'
import { MANAGER_ROLES } from '@/lib/constants'

export const dynamic = 'force-dynamic'

export default async function CalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const query = await searchParams
  const weekParam = typeof query.week === 'string' ? query.week : null
  const dayParam  = typeof query.day  === 'string' ? query.day  : null
  const staffParam = typeof query.staff === 'string' ? query.staff : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tenant = await getTenantBySlug(slug)
  if (!tenant) notFound()
  const tenantId = tenant.tenant_id

  const db = createAdminClient()
  const { data: myStaff } = await db
    .from('staff_members')
    .select('id, role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  const isManagerOrOwner = MANAGER_ROLES.includes((myStaff?.role ?? '') as typeof MANAGER_ROLES[number])
  // When in day view, use the day itself as the week start so we load that week's data
  const weekStart = getWeekMonday(dayParam ?? weekParam)

  // Non-manager/owner staff can only see their own appointments
  const selectedStaffId = staffParam ?? (isManagerOrOwner ? null : (myStaff?.id ?? null))

  const data = await getCalendarioData(tenantId, weekStart, selectedStaffId)
  const timezone = await getTenantTimezone(tenantId)

  return (
    <CalendarioClient
      tenantId={tenantId}
      weekStart={weekStart}
      dayView={dayParam}
      data={data}
      currentStaffId={myStaff?.id ?? null}
      isManagerOrOwner={isManagerOrOwner}
      selectedStaffId={selectedStaffId}
      timezone={timezone}
    />
  )
}
