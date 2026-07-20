'use client'

import { useEffect, useRef } from 'react'
import { Trophy } from 'lucide-react'

interface LoyaltyProgressCardProps {
  availablePoints: number
  totalPoints: number
  tierLabel: string
  nextTierLabel: string | null
  pointsToNextTier: number | null
  progress: number
}

export function LoyaltyProgressCard({
  availablePoints,
  totalPoints: _totalPoints,
  tierLabel,
  nextTierLabel,
  pointsToNextTier,
  progress,
}: LoyaltyProgressCardProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const fmt = new Intl.NumberFormat('it-IT')

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    bar.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (barRef.current) barRef.current.style.width = `${progress}%`
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [progress])

  return (
    <section className="rounded-[28px] bg-neutral-950 p-5 text-white shadow-xl shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
            Punti disponibili
          </p>
          <p
            className="mt-3 font-black tracking-tight text-[var(--brand-primary)]"
            style={{ fontSize: 72, lineHeight: 1 }}
          >
            {fmt.format(availablePoints)}
          </p>
        </div>
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-white/10">
          <Trophy className="size-8 text-[var(--brand-primary)]" />
        </div>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">{tierLabel}</span>
          {nextTierLabel && pointsToNextTier !== null ? (
            <span className="text-white/50">
              {nextTierLabel} a {fmt.format(pointsToNextTier)} pt
            </span>
          ) : (
            <span className="text-white/50">Livello massimo</span>
          )}
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            ref={barRef}
            className="h-full rounded-full styll-bg-brand-primary"
            style={{ width: `${progress}%`, transition: 'width 1s ease-out' }}
          />
        </div>
      </div>
    </section>
  )
}
