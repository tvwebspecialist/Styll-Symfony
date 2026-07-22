import { getDashboardHomeData } from '@/lib/actions/dashboard-home'
import { DashboardHomeClient } from '@/components/dashboard/home/DashboardHomeClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getDashboardHomeData()

  return <DashboardHomeClient data={data} basePath={`/tenant/dashboard/${slug}`} />
}
