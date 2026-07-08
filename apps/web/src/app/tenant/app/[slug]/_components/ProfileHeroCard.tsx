type Tier = 'Bronze' | 'Silver' | 'Gold'

interface ProfileHeroCardProps {
  initials: string
  avatarUrl: string | null
  fullName: string
  tier: Tier
  visitCount: number
  firstVisitYear: number | null
}

const TIER_CONFIG: Record<Tier, { ring: string; badge: string; emoji: string }> = {
  Bronze: {
    ring: '',
    badge: 'bg-amber-100 text-amber-700',
    emoji: '🥉',
  },
  Silver: {
    ring: 'ring-2 ring-neutral-400',
    badge: 'bg-neutral-200 text-neutral-700',
    emoji: '🥈',
  },
  Gold: {
    ring: 'ring-2 ring-yellow-400',
    badge: 'bg-yellow-100 text-yellow-700',
    emoji: '🥇',
  },
}

export function ProfileHeroCard({
  initials,
  fullName,
  tier,
  visitCount,
  firstVisitYear,
}: ProfileHeroCardProps) {
  const cfg = TIER_CONFIG[tier]
  const fmt = new Intl.NumberFormat('it-IT')

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center gap-4">
        <div
          className={[
            'flex size-[72px] shrink-0 items-center justify-center rounded-full',
            'styll-bg-brand-primary-soft text-[22px] font-black text-[var(--brand-primary)]',
            cfg.ring,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="truncate text-xl font-black leading-tight text-neutral-950">{fullName}</p>
            <span
              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cfg.badge}`}
            >
              {cfg.emoji} {tier} Member
            </span>
          </div>

          {(visitCount > 0 || firstVisitYear) && (
            <p className="mt-1.5 text-sm text-neutral-500">
              {visitCount > 0 && (
                <span>
                  {fmt.format(visitCount)}&nbsp;{visitCount === 1 ? 'visita' : 'visite'}
                </span>
              )}
              {visitCount > 0 && firstVisitYear && (
                <span className="mx-1.5 text-neutral-300">·</span>
              )}
              {firstVisitYear && <span>dal {firstVisitYear}</span>}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
