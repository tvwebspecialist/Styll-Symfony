'use client'

import * as React from 'react'
import type { WeekStats } from '@/lib/actions/dashboard-home'

interface Props {
  stats: WeekStats
}

function delta(current: number, prev: number): { pct: string; positive: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

function DeltaBadge({ current, prev }: { current: number; prev: number }) {
  const d = delta(current, prev)
  if (!d) return null
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        padding: '3px 8px',
        borderRadius: 99,
        background: d.positive ? '#dcfce7' : '#fee2e2',
        color: d.positive ? '#15803d' : '#dc2626',
      }}
    >
      {d.pct}
    </span>
  )
}

export function WeekStats({ stats }: Props) {
  const retention = stats.client_count > 0
    ? Math.round(Math.min(100, (stats.client_count / Math.max(stats.client_count, stats.client_count_prev)) * 100))
    : 0

  const metrics = [
    {
      label: 'Revenue settimana',
      value: `€${stats.revenue}`,
      current: stats.revenue,
      prev: stats.revenue_prev,
    },
    {
      label: 'Clienti serviti',
      value: String(stats.client_count),
      current: stats.client_count,
      prev: stats.client_count_prev,
    },
    {
      label: 'Retention %',
      value: `${retention}%`,
      current: retention,
      prev: 0,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {metrics.map((m) => (
        <div
          key={m.label}
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E9E9E9',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#222222',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
              }}
            >
              {m.value}
            </span>
            {m.prev > 0 && <DeltaBadge current={m.current} prev={m.prev} />}
          </div>
          <p style={{ fontSize: 12, color: '#B0B0B0', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            {m.label}
          </p>
        </div>
      ))}
    </div>
  )
}
