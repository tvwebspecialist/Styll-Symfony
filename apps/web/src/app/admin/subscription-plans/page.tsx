import { getPlansWithStats } from '@/app/admin/actions'
import { PlansClient } from './plans-client'

export const dynamic = 'force-dynamic'

export default async function PlansPage() {
  const res = await getPlansWithStats()
  const data = res.data ?? { plans: [], mrr: 0, active_tenants_total: 0 }
  return (
    <PlansClient
      plans={data.plans}
      mrr={data.mrr}
      activeTenantsTotal={data.active_tenants_total}
    />
  )
}
