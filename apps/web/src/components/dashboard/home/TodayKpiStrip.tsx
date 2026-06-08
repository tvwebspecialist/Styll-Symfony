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

function TrendBadge({ current, prev }: { current: number; prev: number }) {
  if (prev === 0) return null
  const pct = Math.round(((current - prev) / prev) * 100)
  const positive = pct >= 0
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: 99,
        background: positive ? '#dcfce7' : '#fee2e2',
        color: positive ? '#15803d' : '#dc2626',
        flexShrink: 0,
        marginLeft: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {pct >= 0 ? '↑' : '↓'}&nbsp;{Math.abs(pct)}%
    </span>
  )
}

interface Props {
  appointments: TodayAppointment[]
  yesterdayStats: YesterdayStats
}

export function TodayKpiStrip({ appointments, yesterdayStats }: Props) {
  const active = appointments.filter((a) => a.status !== 'cancelled')
  const todayCount = active.length
  const todayRevenue = active.reduce((s, a) => s + a.total_price, 0)
  const freeSlots = calcFreeSlotCount(active)

  const now = new Date()
  const nextAppt =
    [...active]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .find((a) => new Date(a.end_time) > now && a.status !== 'completed') ?? null

  const cardStyle: React.CSSProperties = {
    background: '#F9FAFB',
    borderRadius: 14,
    padding: '14px 16px',
    minWidth: 148,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }

  const labelStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 10,
    fontWeight: 600,
    color: '#9CA3AF',
    fontFamily: 'Outfit, sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    lineHeight: 1,
  }

  const valueStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 26,
    fontWeight: 800,
    color: '#111111',
    fontFamily: 'Outfit, sans-serif',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  }

  const subStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'Outfit, sans-serif',
    lineHeight: 1.3,
  }

  return (
    <div className="home-kpi-scroll">
      <div style={{ display: 'flex', gap: 10, minWidth: 'max-content', width: '100%' }}>

        {/* Appuntamenti oggi */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} strokeWidth={2} color="#9CA3AF" />
            <p style={labelStyle}>Appuntamenti</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={valueStyle}>{todayCount}</p>
            <TrendBadge current={todayCount} prev={yesterdayStats.appointment_count} />
          </div>
          <p style={subStyle}>
            {nextAppt
              ? `Prossimo alle ${fmt(nextAppt.start_time)}`
              : todayCount === 0
                ? 'Nessuno oggi'
                : 'Tutti completati'}
          </p>
        </div>

        {/* Revenue stimata */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <TrendingUp size={13} strokeWidth={2} color="#9CA3AF" />
            <p style={labelStyle}>Revenue oggi</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <p style={valueStyle}>€{todayRevenue}</p>
            <TrendBadge current={todayRevenue} prev={yesterdayStats.revenue} />
          </div>
          <p style={subStyle}>Stimata da confermati</p>
        </div>

        {/* Slot liberi */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} strokeWidth={2} color="#9CA3AF" />
            <p style={labelStyle}>Slot liberi</p>
          </div>
          <p style={valueStyle}>{freeSlots}</p>
          <p style={subStyle}>
            {freeSlots === 0 ? 'Agenda piena!' : `Disponibili oggi (≥${MIN_FREE_SLOT}min)`}
          </p>
        </div>

      </div>
    </div>
  )
}
