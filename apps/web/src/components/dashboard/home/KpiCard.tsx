'use client'

import * as React from 'react'
import type { WeekStats } from '@/lib/actions/dashboard-home'

interface Props {
  stats: WeekStats
}

function delta(current: number, prev: number): { text: string; positive: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  return { text: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

function Metric({
  label,
  value,
  current,
  prev,
}: {
  label: string
  value: string
  current: number
  prev: number
}) {
  const d = delta(current, prev)
  return (
    <div
      style={{
        background: '#F9FAFB',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 600,
          color: '#9CA3AF',
          fontFamily: 'Outfit, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          lineHeight: 1,
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 800,
            color: '#111111',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          {value}
        </p>
        {d && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 7px',
              borderRadius: 99,
              background: d.positive ? '#dcfce7' : '#fee2e2',
              color: d.positive ? '#15803d' : '#dc2626',
              flexShrink: 0,
            }}
          >
            {d.text}
          </span>
        )}
      </div>
    </div>
  )
}

export function KpiCard({ stats }: Props) {
  const retention =
    stats.client_count > 0
      ? Math.round(
          Math.min(
            100,
            (stats.client_count / Math.max(stats.client_count, stats.client_count_prev)) * 100,
          ),
        )
      : 0

  return (
    <div
      aria-label="KPI settimanali"
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 13,
          fontWeight: 700,
          color: '#111111',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.2px',
        }}
      >
        Settimana in corso
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Metric
          label="Revenue settimana"
          value={`€${stats.revenue}`}
          current={stats.revenue}
          prev={stats.revenue_prev}
        />
        <Metric
          label="Clienti serviti"
          value={String(stats.client_count || '–')}
          current={stats.client_count}
          prev={stats.client_count_prev}
        />
        <Metric
          label="Retention"
          value={`${retention}%`}
          current={retention}
          prev={0}
        />
      </div>
    </div>
  )
}
