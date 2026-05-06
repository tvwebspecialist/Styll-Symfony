import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getDashboardHomeData } from '@/lib/actions/dashboard-home'
import { DashboardHomeClient } from '@/components/dashboard/home/DashboardHomeClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await getDashboardHomeData()

  return (
    <div style={{ padding: 24 }}>
      <DashboardHomeClient data={data} basePath={`/tenant/dashboard/${slug}`} />
    </div>
  )
}
