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

function TrendBadge({ diff, suffix = '' }: { diff: number; suffix?: string }) {
  const positive = diff >= 0
  if (diff === 0) return null
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
      flexShrink: 0,
      lineHeight: 1.4,
    }}>
      {diff > 0 ? '+' : ''}{diff}{suffix} ieri
    </span>
  )
}

const CARD_DEFS = [
  { key: 'appt',    Icon: Calendar,      label: 'Appuntamenti', imgSrc: '/img/Appuntamenti.png', href: 'calendario' },
  { key: 'revenue', Icon: TrendingUp,    label: 'Incassi oggi', imgSrc: '/img/guadagni.png',     href: 'vendite'    },
  { key: 'slots',   Icon: Clock,         label: 'Slot liberi',  imgSrc: '/img/megafono_icon.png', href: 'calendario' },
  { key: 'confirm', Icon: CheckCircle2,  label: 'Confermati',   imgSrc: '/img/ceck.png',          href: 'clienti'   },
] as const

interface CardValue {
  main: React.ReactNode
  sub: string
  diffNode?: React.ReactNode
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
  const nextAppt =
    [...active]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .find((a) => new Date(a.end_time) > now && a.status !== 'completed') ?? null

  const values: Record<string, CardValue> = {
    appt: {
      main: todayCount,
      sub: nextAppt
        ? `Prossimo alle ${fmt(nextAppt.start_time)}`
        : todayCount === 0 ? 'Nessuno oggi' : 'Tutti completati',
      diffNode: <TrendBadge diff={todayCount - yesterdayStats.appointment_count} />,
    },
    revenue: {
      main: `€${todayRevenue}`,
      sub: 'Stimati dai confermati',
      diffNode: <TrendBadge diff={todayRevenue - yesterdayStats.revenue} suffix="€" />,
    },
    slots: {
      main: freeSlots,
      sub: freeSlots === 0 ? 'Agenda piena!' : `Disponibili (≥${MIN_FREE_SLOT}min)`,
    },
    confirm: {
      main: confirmRate !== null ? `${confirmRate}%` : '–',
      sub: confirmRate !== null
        ? `${confirmed} di ${todayCount} confermati`
        : 'Nessun appuntamento',
    },
  }

  return (
    <div className="kpi-shopify-grid">
      {CARD_DEFS.map(({ key, Icon, label, imgSrc, href }) => {
        const v = values[key]!
        return (
          <div
            key={key}
            className="kpi-shopify-card"
            role="button"
            tabIndex={0}
            onClick={() => router.push(`${basePath}/${href}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/${href}`) }}
            aria-label={`${label}: ${v.main}`}
          >
            {/* Label row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              flexWrap: 'wrap',
            }}>
              <Icon size={12} color="#9CA3AF" strokeWidth={2.5} />
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#9CA3AF',
                fontFamily: 'Outfit, sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                lineHeight: 1,
              }}>
                {label}
              </span>
              {v.diffNode}
            </div>

            {/* Main value */}
            <div style={{
              fontSize: 36,
              fontWeight: 800,
              color: '#111111',
              fontFamily: 'Outfit, sans-serif',
              lineHeight: 1,
              letterSpacing: '-0.025em',
              marginBottom: 8,
              paddingRight: 74,
            }}>
              {v.main}
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 12,
              color: '#9CA3AF',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: 500,
              lineHeight: 1.3,
              paddingRight: 74,
            }}>
              {v.sub}
            </div>

            {/* 3D icon — right side */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              aria-hidden="true"
              style={{
                position: 'absolute',
                right: -8,
                bottom: -10,
                width: 88,
                height: 88,
                objectFit: 'contain',
                pointerEvents: 'none',
                userSelect: 'none',
                transform: 'rotate(-10deg) scale(1.05)',
                filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.13))',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )
      })}
    </div>
  )
}
