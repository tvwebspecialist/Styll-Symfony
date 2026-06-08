'use client'

import * as React from 'react'
import { Calendar, TrendingUp, Clock } from 'lucide-react'
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

interface Props {
  appointments: TodayAppointment[]
  yesterdayStats: YesterdayStats
}

const CARDS = [
  {
    key: 'appt',
    bg: '#F0F4FF',
    accent: '#3B6FE8',
    icon: Calendar,
    label: 'Appuntamenti oggi',
    imgSrc: '/img/Appuntamenti.png',
  },
  {
    key: 'revenue',
    bg: '#F0FFF4',
    accent: '#16A34A',
    icon: TrendingUp,
    label: 'Incassi di oggi',
    imgSrc: '/img/guadagni.png',
  },
  {
    key: 'slots',
    bg: '#FFF7ED',
    accent: '#EA580C',
    icon: Clock,
    label: 'Ore libere oggi',
    imgSrc: '/img/megafono_icon.png',
  },
] as const

export function TodayKpiStrip({ appointments }: Props) {
  const active = appointments.filter((a) => a.status !== 'cancelled')
  const todayCount = active.length
  const todayRevenue = active.reduce((s, a) => s + a.total_price, 0)
  const freeSlots = calcFreeSlotCount(active)

  const now = new Date()
  const nextAppt =
    [...active]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .find((a) => new Date(a.end_time) > now && a.status !== 'completed') ?? null

  const values: Record<string, { main: React.ReactNode; sub: string }> = {
    appt: {
      main: todayCount,
      sub: nextAppt
        ? `Prossimo alle ${fmt(nextAppt.start_time)}`
        : todayCount === 0
          ? 'Nessuno oggi'
          : 'Tutti completati',
    },
    revenue: {
      main: `€${todayRevenue}`,
      sub: 'Stimati dai confermati',
    },
    slots: {
      main: freeSlots,
      sub: freeSlots === 0 ? 'Agenda piena!' : `Disponibili (≥${MIN_FREE_SLOT}min)`,
    },
  }

  return (
    <div className="home-kpi-row">
      {CARDS.map(({ key, bg, accent, icon: Icon, label, imgSrc }) => {
        const { main, sub } = values[key]!
        return (
          <div
            key={key}
            style={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 'var(--card-radius)',
              padding: '20px 20px 16px 20px',
              flex: '1 1 0',
              minWidth: 0,
              minHeight: 140,
              background: bg,
              border: 'none',
            }}
          >
            {/* Label */}
            <div style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: accent,
              opacity: 0.75,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontFamily: 'Outfit, sans-serif',
            }}>
              <Icon size={12} strokeWidth={2} />
              {label}
            </div>

            {/* Main value */}
            <div className="kpi-card-value" style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1,
              color: '#111827',
              letterSpacing: '-0.02em',
              paddingRight: 130,
              marginBottom: 6,
              fontFamily: 'Outfit, sans-serif',
            }}>
              {main}
            </div>

            {/* Subtitle */}
            <div style={{
              fontSize: 12,
              color: '#6B7280',
              fontWeight: 500,
              fontFamily: 'Outfit, sans-serif',
            }}>
              {sub}
            </div>

            {/* 3D icon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt=""
              aria-hidden="true"
              className="kpi-card-3d-icon"
              style={{
                position: 'absolute',
                bottom: -28,
                right: -22,
                width: 160,
                height: 160,
                objectFit: 'contain',
                opacity: 1,
                pointerEvents: 'none',
                userSelect: 'none',
                transform: 'rotate(-12deg) scale(1.05)',
                filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))',
              }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          </div>
        )
      })}
    </div>
  )
}
