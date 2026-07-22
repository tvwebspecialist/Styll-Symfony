import { getPlansWithStats } from '@/app/admin/actions-plans'
import { fetchSymfonyAdminJson } from '@/lib/symfony/admin-client'
import { SubscriptionForm } from './subscription-form'

export const dynamic = 'force-dynamic'

export default async function TenantSubscriptionPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const [plansRes, tenant] = await Promise.all([
    getPlansWithStats(),
    fetchSymfonyAdminJson<{
      subscription: {
        plan_id: string | null
        status: string | null
        current_period_start: string | null
        current_period_end: string | null
      }
    }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}`),
  ])

  const plans = plansRes.data?.plans ?? []
  const sub = tenant.subscription

  return (
    <div className="rounded-xl border bg-white p-5 ">
      <h2 className="text-sm font-semibold">Abbonamento</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Gestisci il piano attivo e le date di rinnovo per questo tenant.
      </p>
      <div className="mt-4">
        <SubscriptionForm
          tenantId={tenantId}
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            price_monthly: p.price_monthly,
            is_active: p.is_active,
          }))}
          current={
            sub
              ? {
                  plan_id: sub.plan_id ?? null,
                  status: sub.status ?? 'active',
                  starts_at: sub.current_period_start ?? null,
                  ends_at: sub.current_period_end ?? null,
                }
              : null
          }
        />
      </div>
    </div>
  )
}
