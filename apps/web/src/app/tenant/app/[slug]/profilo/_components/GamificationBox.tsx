'use client'

import Link from 'next/link'
import { useRef, useEffect } from 'react'

interface Props {
  availablePoints: number
  totalPoints: number
  tierLabel: string
  nextTierLabel: string | null
  pointsToNextTier: number | null
  progress: number
  puntiPath: string
  primaryColor: string
}

export function GamificationBox({
  availablePoints,
  tierLabel,
  nextTierLabel,
  pointsToNextTier,
  progress,
  puntiPath,
  primaryColor,
}: Props) {
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

  function darkenColor(hex: string, amount = 0.35): string {
    try {
      const h = hex.replace('#', '')
      const r = Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * (1 - amount)))
      const g = Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * (1 - amount)))
      const b = Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * (1 - amount)))
      return `rgb(${r},${g},${b})`
    } catch {
      return '#111111'
    }
  }

  return (
    <Link
      href={puntiPath}
      className="block rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}, ${darkenColor(primaryColor)})`,
      }}
    >
      <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/60 mb-1">
          Punti disponibili
        </p>
        <p className="text-[56px] font-black text-white leading-none mb-4">
          {fmt.format(availablePoints)}
        </p>

        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-bold text-white">{tierLabel}</span>
            {nextTierLabel && pointsToNextTier !== null ? (
              <span className="text-white/60 text-xs">
                Ancora {fmt.format(pointsToNextTier)} pt per {nextTierLabel}
              </span>
            ) : (
              <span className="text-white/60 text-xs">Livello massimo</span>
            )}
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              ref={barRef}
              className="h-full rounded-full bg-white"
              style={{ width: `${progress}%`, transition: 'width 1s ease-out' }}
            />
          </div>
        </div>
      </div>
    </Link>
  )
}
