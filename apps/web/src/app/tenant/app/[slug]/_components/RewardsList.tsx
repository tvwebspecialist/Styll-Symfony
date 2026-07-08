import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { RedeemSheet } from './RedeemSheet'

type RewardType = 'product' | 'service' | 'discount' | 'custom'

export interface RewardItem {
  id: string
  name: string
  description: string | null
  reward_type: RewardType
  points_cost: number
}

interface RewardsListProps {
  rewards: RewardItem[]
  availablePoints: number
  puntiPath: string
}

const REWARD_ICONS: Record<RewardType, string> = {
  product: '🎁',
  service: '✂️',
  discount: '💸',
  custom: '⭐',
}

export function RewardsList({ rewards, availablePoints, puntiPath }: RewardsListProps) {
  if (rewards.length === 0) return null

  const fmt = new Intl.NumberFormat('it-IT')
  const redeemable = rewards.filter((r) => availablePoints >= r.points_cost)
  const upcoming = rewards.filter((r) => availablePoints < r.points_cost)
  const nextReward = upcoming[0] ?? null

  return (
    <>
      {/* Section D — Prossimo reward */}
      {nextReward && (
        <section className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-950">Reward in arrivo</h2>
            <Link
              href={puntiPath}
              className="flex items-center gap-1 text-sm font-bold text-[var(--brand-primary)]"
              aria-label="Vedi tutti i premi"
            >
              Tutti <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 rounded-2xl bg-neutral-50 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden="true">
                {REWARD_ICONS[nextReward.reward_type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-neutral-950">{nextReward.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Ti mancano{' '}
                  <span className="font-bold text-[var(--brand-primary)]">
                    {fmt.format(nextReward.points_cost - availablePoints)} pt
                  </span>
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-neutral-200 px-2.5 py-1 text-xs font-bold text-neutral-600">
                {fmt.format(nextReward.points_cost)} pt
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
              <div
                className="h-full rounded-full styll-bg-brand-primary"
                style={{
                  width: `${Math.min(100, Math.round((availablePoints / nextReward.points_cost) * 100))}%`,
                }}
              />
            </div>
          </div>
        </section>
      )}

      {/* Section E — Rewards riscattabili */}
      {redeemable.length > 0 && (
        <section
          className="rounded-[28px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--brand-primary) 8%, white)' }}
        >
          <h2 className="text-base font-bold text-neutral-950">Pronti per il riscatto 🎉</h2>
          <div className="mt-4 flex flex-col gap-3">
            {redeemable.map((reward) => (
              <RedeemSheet
                key={reward.id}
                reward={{
                  id: reward.id,
                  name: reward.name,
                  pointsCost: reward.points_cost,
                  rewardType: reward.reward_type,
                }}
              >
                <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4 shadow-sm">
                  <span className="text-2xl" aria-hidden="true">
                    {REWARD_ICONS[reward.reward_type]}
                  </span>
                  <p className="min-w-0 flex-1 truncate font-bold text-neutral-950">
                    {reward.name}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full styll-bg-brand-primary-soft px-2.5 py-1 text-xs font-bold text-[var(--brand-primary)]">
                      {fmt.format(reward.points_cost)} pt
                    </span>
                    <span className="rounded-xl styll-bg-brand-primary px-3 py-1.5 text-xs font-bold text-white">
                      Riscatta
                    </span>
                  </div>
                </div>
              </RedeemSheet>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
