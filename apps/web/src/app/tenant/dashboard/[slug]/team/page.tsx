import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { getTeamData } from '@/lib/actions/team'
import { TeamClient } from '@/components/dashboard/team/TeamClient'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  const data = await getTeamData()
  return <TeamClient {...data} />
}
