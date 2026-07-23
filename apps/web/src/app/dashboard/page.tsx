import { getDashboardHomeData } from '@/lib/actions/dashboard-home'
import { DashboardHomeClient } from '@/components/dashboard/home/DashboardHomeClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const data = await getDashboardHomeData()

  return <DashboardHomeClient data={data} basePath="/dashboard" />
}
