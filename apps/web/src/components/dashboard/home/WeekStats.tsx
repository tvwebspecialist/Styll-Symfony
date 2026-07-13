'use client'

import * as React from 'react'
import { TrendingUp, Users, RefreshCcw } from 'lucide-react'
import type { WeekStats, TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  stats: WeekStats
  weekAppointments: TodayAppointment[]
}

function delta(current: number, prev: number): { pct: string; positive: boolean } | null {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  return { pct: `${pct >= 0 ? '+' : ''}${pct}%`, positive: pct >= 0 }
}

function PillBadge({ current, prev }: { current: number; prev: number }) {
  const d = delta(current, prev)
  if (!d) return null
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 99,
      background: d.positive ? '#D1FAE5' : '#FEE2E2',
      color: d.positive ? '#059669' : '#DC2626',
      fontFamily: 'Outfit, sans-serif',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>
      {d.pct}
    </span>
  )
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function intensityColor(count: number): string {
  if (count === 0) return '#FFFFFF'
  if (count <= 2) return 'rgba(249,115,22,0.20)'
  if (count <= 4) return 'rgba(249,115,22,0.50)'
  return 'rgba(249,115,22,0.85)'
}

function intensityTextColor(count: number): string {
  return count >= 5 ? '#FFFFFF' : count >= 3 ? '#7C2D12' : count >= 1 ? '#C2410C' : '#9CA3AF'
}

function buildDayCountMap(weekAppointments: TodayAppointment[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const a of weekAppointments) {
    const d = a.start_time.slice(0, 10)
    map.set(d, (map.get(d) ?? 0) + 1)
  }
  return map
}

function getWeekDates(): string[] {
  const now = new Date()
  const dow = now.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const monday = new Date(now.getTime() - daysFromMon * 86400000)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getTime() + i * 86400000)
    return d.toISOString().slice(0, 10)
  })
}

export function WeekStats({ stats, weekAppointments }: Props) {
  const retention =
    stats.client_count > 0
      ? Math.round(Math.min(100, (stats.client_count / Math.max(stats.client_count, stats.client_count_prev)) * 100))
      : 0

  const metrics = [
    { label: 'Revenue', value: `€${stats.revenue}`, current: stats.revenue, prev: stats.revenue_prev, icon: <TrendingUp size={13} color="#22C55E" strokeWidth={2} />, iconBg: 'rgba(34,197,94,0.10)' },
    { label: 'Clienti', value: String(stats.client_count), current: stats.client_count, prev: stats.client_count_prev, icon: <Users size={13} color="#3B82F6" strokeWidth={2} />, iconBg: 'rgba(59,130,246,0.10)' },
    { label: 'Retention', value: `${retention}%`, current: retention, prev: 0, icon: <RefreshCcw size={13} color="#8B5CF6" strokeWidth={2} />, iconBg: 'rgba(139,92,246,0.10)' },
  ]

  const dayCountMap = buildDayCountMap(weekAppointments)
  const weekDates = getWeekDates()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 3 mini KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {metrics.map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--card-bg, #FFFFFF)',
              borderRadius: 10,
              border: '1px solid var(--card-border, #E9E9E9)',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              transition: 'background 0.15s ease, transform 0.15s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F7F7F7'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--card-bg, #FFFFFF)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
          >
            {/* Icon + label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: m.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {m.icon}
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#6B7280',
                fontFamily: 'Outfit, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                lineHeight: 1,
              }}>
                {m.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 19,
                fontWeight: 800,
                color: '#111111',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {m.value}
              </span>
              {m.prev > 0 && <PillBadge current={m.current} prev={m.prev} />}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap settimana */}
      <div style={{
        background: 'var(--card-bg, #FFFFFF)',
        borderRadius: 10,
        border: '1px solid var(--card-border, #E9E9E9)',
        padding: '12px 14px',
      }}>
        <p style={{
          margin: '0 0 10px',
          fontSize: 11,
          fontWeight: 700,
          color: '#9CA3AF',
          fontFamily: 'Outfit, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Andamento settimana
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 6,
        }}>
          {weekDates.map((date, i) => {
            const count = dayCountMap.get(date) ?? 0
            const isToday = date === new Date().toISOString().slice(0, 10)
            return (
              <div key={date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 8,
                  background: intensityColor(count),
                  border: isToday ? '2px solid rgba(249,115,22,0.80)' : count === 0 ? '1px solid #E9E9E9' : '1px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}>
                  {count > 0 && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: intensityTextColor(count),
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1,
                    }}>
                      {count}
                    </span>
                  )}
                </div>
                <span style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: isToday ? '#F97316' : '#9CA3AF',
                  fontFamily: 'Outfit, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}>
                  {DAY_LABELS[i]}
                </span>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          {[
            { color: '#FFFFFF', label: 'Vuoto' },
            { color: 'rgba(249,115,22,0.20)', label: '1–2' },
            { color: 'rgba(249,115,22,0.50)', label: '3–4' },
            { color: 'rgba(249,115,22,0.85)', label: '5+' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, border: '1px solid rgba(0,0,0,0.08)' }} />
              <span style={{ fontSize: 9, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
