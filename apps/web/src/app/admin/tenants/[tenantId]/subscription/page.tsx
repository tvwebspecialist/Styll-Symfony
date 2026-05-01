import { createAdminClient } from '@/lib/supabase/admin'
import { SubscriptionForm } from './subscription-form'

export const dynamic = 'force-dynamic'

export default async function TenantSubscriptionPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const db = createAdminClient()

  const [{ data: plans }, { data: sub }] = await Promise.all([
    db
      .from('subscription_plans')
      .select('id, name, price_monthly, is_active')
      .order('price_monthly', { ascending: true }),
    db
      .from('tenant_subscriptions')
      .select('plan_id, status, current_period_start, current_period_end')
      .eq('tenant_id', tenantId)
      .maybeSingle(),
  ])

  return (
    <div className="rounded-xl border bg-white p-5 ">
      <h2 className="text-sm font-semibold">Abbonamento</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Gestisci il piano attivo e le date di rinnovo per questo tenant.
      </p>
      <div className="mt-4">
        <SubscriptionForm
          tenantId={tenantId}
          plans={(plans ?? []).map((p) => ({
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
