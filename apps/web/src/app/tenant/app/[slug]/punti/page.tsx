import { notFound, redirect } from 'next/navigation'
import { Gift, History, Trophy } from 'lucide-react'
import { getMyClientRecord } from '@/lib/actions/client-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

function tierFor(totalPoints: number): {
  label: string
  currentMin: number
  nextLabel: string | null
  nextMin: number | null
} {
  if (totalPoints >= 1000) return { label: 'Gold', currentMin: 1000, nextLabel: null, nextMin: null }
  if (totalPoints >= 500) return { label: 'Silver', currentMin: 500, nextLabel: 'Gold', nextMin: 1000 }
  return { label: 'Bronze', currentMin: 0, nextLabel: 'Silver', nextMin: 500 }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default async function PuntiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const basePath = `/tenant/app/${slug}`
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`${basePath}/accesso?mode=login&return_to=/punti`)
  }

  const clientRecord = await getMyClientRecord(tenant.tenant_id)
  if (!clientRecord) {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <h1 className="text-lg font-extrabold">Punti non disponibili</h1>
          <p className="mt-2 text-sm leading-6">Non troviamo ancora una scheda cliente collegata al tuo account.</p>
        </div>
      </main>
    )
  }

  const db = createAdminClient()
  const [loyaltyRes, rewardsRes, transactionsRes] = await Promise.all([
    db
      .from('client_loyalty')
      .select('available_points, total_points, current_streak, longest_streak, last_visit_date')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', clientRecord.id)
      .maybeSingle(),
    db
      .from('rewards')
      .select('id, name, description, reward_type, points_cost')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .order('points_cost', { ascending: true }),
    db
      .from('loyalty_transactions')
      .select('id, type, points, description, created_at')
      .eq('tenant_id', tenant.tenant_id)
      .eq('client_id', clientRecord.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const totalPoints = loyaltyRes.data?.total_points ?? 0
  const availablePoints = loyaltyRes.data?.available_points ?? clientRecord.points
  const tier = tierFor(totalPoints)
  const progress = tier.nextMin
    ? Math.min(100, Math.round(((totalPoints - tier.currentMin) / (tier.nextMin - tier.currentMin)) * 100))
    : 100

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-4">
      <section className="rounded-[28px] bg-neutral-950 p-5 text-white shadow-xl shadow-black/20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Punti disponibili</p>
            <p className="mt-3 text-6xl font-black tracking-tight text-[var(--brand-primary)]">{availablePoints}</p>
          </div>
          <div className="flex size-16 items-center justify-center rounded-full bg-white/10">
            <Trophy className="size-8 text-[var(--brand-primary)]" />
          </div>
        </div>
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-bold">{tier.label}</span>
            <span className="text-white/50">
              {tier.nextLabel ? `${tier.nextLabel} a ${tier.nextMin} pt` : 'Livello massimo'}
            </span>
          </div>
          <progress
            value={progress}
            max={100}
            className="mt-2 h-2 w-full overflow-hidden rounded-full accent-[var(--brand-primary)] [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[var(--brand-primary)]"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Gift className="size-5 text-[var(--brand-primary)]" />
          <h2 className="text-base font-extrabold text-neutral-950">Rewards disponibili</h2>
        </div>
        <div className="mt-4 grid gap-3">
          {(rewardsRes.data ?? []).length > 0 ? (
            (rewardsRes.data ?? []).map((reward) => (
              <div key={reward.id} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-neutral-950">{reward.name}</p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {reward.description || 'Premio disponibile nel programma fedeltà.'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--brand-primary)]">
                    {reward.points_cost} pt
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-500">
              Nessun premio disponibile al momento.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-neutral-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <History className="size-5 text-[var(--brand-primary)]" />
          <h2 className="text-base font-extrabold text-neutral-950">Storico punti</h2>
        </div>
        <div className="mt-4 divide-y divide-neutral-100">
          {(transactionsRes.data ?? []).length > 0 ? (
            (transactionsRes.data ?? []).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-bold text-neutral-950">
                    {transaction.description ?? transaction.type}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">{formatDate(transaction.created_at)}</p>
                </div>
                <span
                  className={`font-extrabold ${
                    transaction.points >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {transaction.points >= 0 ? '+' : ''}
                  {transaction.points}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-neutral-500">Non ci sono ancora movimenti punti.</p>
          )}
        </div>
      </section>
    </main>
  )
}
