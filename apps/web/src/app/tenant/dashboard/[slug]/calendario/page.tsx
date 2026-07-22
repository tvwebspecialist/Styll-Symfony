import { notFound, redirect } from 'next/navigation'
import { getCalendarioData } from '@/lib/actions/calendario'
import { getTenantTimezone } from '@/lib/actions/public-booking'
import { getWeekMonday } from '@/lib/utils/week'
import { CalendarioClient } from '@/components/dashboard/calendario/CalendarioClient'
import { MANAGER_ROLES } from '@/lib/constants'
import { getOptionalSymfonyStaffMe } from '@/lib/symfony/staff-context'

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

  const me = await getOptionalSymfonyStaffMe(slug)
  const tenantId = me?.currentTenant?.tenant.id
  if (!tenantId) notFound()
  const currentRole = me?.currentTenant?.tenant.id === tenantId ? me.currentRole : null
  const currentStaffId = me?.currentTenant?.tenant.id === tenantId
    ? me.currentTenant?.staffMemberId ?? null
    : null
  const isManagerOrOwner = MANAGER_ROLES.includes((currentRole ?? '') as typeof MANAGER_ROLES[number])
  // When in day view, use the day itself as the week start so we load that week's data
  const weekStart = getWeekMonday(dayParam ?? weekParam)

  // Non-manager/owner staff can only see their own appointments
  const selectedStaffId = staffParam ?? (isManagerOrOwner ? null : currentStaffId)

  const [data, timezone] = await Promise.all([
    getCalendarioData(tenantId, weekStart, selectedStaffId),
    getTenantTimezone(tenantId),
  ])

  return (
    <CalendarioClient
      tenantId={tenantId}
      weekStart={weekStart}
      dayView={dayParam}
      data={data}
      currentStaffId={currentStaffId}
      isManagerOrOwner={isManagerOrOwner}
      selectedStaffId={selectedStaffId}
      timezone={timezone}
    />
  )
}
