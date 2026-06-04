interface StreakCardProps {
  currentStreak: number
  longestStreak: number
}

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  const isCelebration = currentStreak >= 5

  return (
    <section
      className={[
        'rounded-[28px] bg-white p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]',
        isCelebration ? 'ring-2 ring-orange-400/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${
            isCelebration ? 'bg-orange-100' : 'bg-neutral-100'
          }`}
          aria-hidden="true"
        >
          🔥
        </div>

        <div className="flex-1">
          {currentStreak > 0 ? (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-neutral-950">{currentStreak}</span>
                <span className="text-sm font-medium text-neutral-500">visite consecutive</span>
              </div>
              {longestStreak > 0 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Record personale:{' '}
                  <span className="font-bold text-neutral-600">{longestStreak}</span>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-neutral-950">Inizia la tua streak!</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Prenota la tua prossima visita per cominciare.
              </p>
              {longestStreak > 0 && (
                <p className="mt-1 text-xs text-neutral-400">
                  Il tuo record:{' '}
                  <span className="font-bold text-neutral-600">{longestStreak}</span>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
