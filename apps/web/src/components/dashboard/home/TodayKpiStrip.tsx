'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import type { TodayAppointment, YesterdayStats } from '@/lib/actions/dashboard-home'

const WORK_START = 8
const WORK_END = 20
const MIN_FREE_SLOT = 30

function calcFreeSlotCount(appointments: TodayAppointment[]): number {
  const sorted = [...appointments]
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  let count = 0
  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const startMin = new Date(appt.start_time).getHours() * 60 + new Date(appt.start_time).getMinutes()
    const endMin = new Date(appt.end_time).getHours() * 60 + new Date(appt.end_time).getMinutes()
    if (startMin - cursor >= MIN_FREE_SLOT) count++
    cursor = Math.max(cursor, endMin)
  }
  if (WORK_END * 60 - cursor >= MIN_FREE_SLOT) count++
  return count
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function PillBadge({ diff, suffix = '' }: { diff: number; suffix?: string }) {
  if (diff === 0) return null
  const positive = diff > 0
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 99,
      background: positive ? '#D1FAE5' : '#FEE2E2',
      color: positive ? '#059669' : '#DC2626',
      fontFamily: 'Outfit, sans-serif',
      letterSpacing: '0.01em',
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
    }}>
      {diff > 0 ? '+' : ''}{diff}{suffix} ieri
    </span>
  )
}

interface IconBoxProps {
  icon: React.ReactNode
  bg: string
}
function IconBox({ icon, bg }: IconBoxProps) {
  return (
    <div style={{
      width: 34,
      height: 34,
      borderRadius: 9,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {icon}
    </div>
  )
}

interface CardDef {
  key: string
  icon: React.ReactNode
  iconBg: string
  label: string
  href: string
}

interface CardValue {
  main: React.ReactNode
  sub: string
  trend?: React.ReactNode
}

interface Props {
  appointments: TodayAppointment[]
  yesterdayStats: YesterdayStats
  basePath: string
}

export function TodayKpiStrip({ appointments, yesterdayStats, basePath }: Props) {
  const router = useRouter()
  const active = appointments.filter((a) => a.status !== 'cancelled')
  const todayCount   = active.length
  const todayRevenue = active.reduce((s, a) => s + a.total_price, 0)
  const freeSlots    = calcFreeSlotCount(active)
  const confirmed    = active.filter((a) => a.status === 'confirmed').length
  const confirmRate  = todayCount > 0 ? Math.round((confirmed / todayCount) * 100) : null

  const now = new Date()
  const nextAppt = [...active]
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .find((a) => new Date(a.end_time) > now && a.status !== 'completed') ?? null

  const CARDS: CardDef[] = [
    {
      key: 'appt',
      icon: <Calendar size={16} color="#3B82F6" strokeWidth={2} />,
      iconBg: 'rgba(59,130,246,0.10)',
      label: 'Appuntamenti',
      href: 'calendario',
    },
    {
      key: 'revenue',
      icon: <TrendingUp size={16} color="#22C55E" strokeWidth={2} />,
      iconBg: 'rgba(34,197,94,0.10)',
      label: 'Incassi oggi',
      href: 'vendite',
    },
    {
      key: 'slots',
      icon: <Clock size={16} color="#F97316" strokeWidth={2} />,
      iconBg: 'rgba(249,115,22,0.10)',
      label: 'Slot liberi',
      href: 'calendario',
    },
    {
      key: 'confirm',
      icon: <CheckCircle2 size={16} color="#8B5CF6" strokeWidth={2} />,
      iconBg: 'rgba(139,92,246,0.10)',
      label: 'Confermati',
      href: 'clienti',
    },
  ]

  const values: Record<string, CardValue> = {
    appt: {
      main: todayCount,
      sub: nextAppt
        ? `Prossimo: ${fmt(nextAppt.start_time)}`
        : todayCount === 0 ? 'Nessuno oggi' : 'Tutti completati',
      trend: <PillBadge diff={todayCount - yesterdayStats.appointment_count} />,
    },
    revenue: {
      main: `€${todayRevenue}`,
      sub: 'Stimati dai confermati',
      trend: <PillBadge diff={todayRevenue - yesterdayStats.revenue} suffix="€" />,
    },
    slots: {
      main: freeSlots,
      sub: freeSlots === 0 ? 'Agenda piena!' : `≥${MIN_FREE_SLOT}min liberi`,
    },
    confirm: {
      main: confirmRate !== null ? `${confirmRate}%` : '–',
      sub: confirmRate !== null
        ? `${confirmed}/${todayCount} confermati`
        : 'Nessun appuntamento',
    },
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 12,
    }}>
      {CARDS.map(({ key, icon, iconBg, label, href }) => {
        const v = values[key]!
        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`${basePath}/${href}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/${href}`) }}
            aria-label={`${label}: ${v.main}`}
            style={{
              background: 'var(--card-bg, #FFFFFF)',
              border: '1px solid var(--card-border, #E9E9E9)',
              borderRadius: 12,
              padding: '12px 14px',
              cursor: 'pointer',
              outline: 'none',
              WebkitTapHighlightColor: 'rgba(0,0,0,0)',
              transition: 'background 0.15s ease, transform 0.15s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F7F7F7'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--card-bg, #FFFFFF)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
          >
            {/* Icon + label inline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconBox icon={icon} bg={iconBg} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9CA3AF',
                fontFamily: 'Outfit, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}>
                {label}
              </span>
            </div>

            {/* Main value + trend */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
              <span style={{
                fontSize: 28,
                fontWeight: 800,
                color: '#111111',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
                letterSpacing: '-0.03em',
              }}>
                {v.main}
              </span>
              {v.trend}
            </div>

            {/* Sub */}
            <span style={{
              fontSize: 11,
              color: '#9CA3AF',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 500,
              lineHeight: 1.3,
              marginTop: 2,
            }}>
              {v.sub}
            </span>
          </div>
        )
      })}
    </div>
  )
}
