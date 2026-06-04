interface BadgeItem {
  id: string
  name: string
  icon: string
  isUnlocked: boolean
  condition?: string | null
}

interface BadgeGridProps {
  badges: BadgeItem[]
  isVipClub: boolean
}

export function BadgeGrid({ badges, isVipClub }: BadgeGridProps) {
  if (!isVipClub && badges.length === 0) return null

  const visible = badges.slice(0, 8)
  const hasMore = badges.length > 8

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]">
      <h2 className="text-base font-bold text-neutral-950">I tuoi badge</h2>

      {badges.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          Completa le tue prime visite per sbloccare i badge! 🏅
        </p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {visible.map((badge) => (
              <div key={badge.id} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex size-14 items-center justify-center rounded-full text-2xl ${
                    badge.isUnlocked ? 'bg-[var(--brand-primary)]/10' : 'bg-neutral-100 opacity-40'
                  }`}
                  title={
                    badge.isUnlocked
                      ? badge.name
                      : (badge.condition ?? `Blocca: ${badge.name}`)
                  }
                  aria-label={badge.name}
                >
                  {badge.isUnlocked ? badge.icon : '🔒'}
                </div>
                <p className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-neutral-600">
                  {badge.name}
                </p>
              </div>
            ))}
          </div>

          {hasMore && (
            <p className="mt-4 text-sm font-bold text-[var(--brand-primary)]">
              +{badges.length - 8} altri badge
            </p>
          )}
        </>
      )}
    </section>
  )
}
