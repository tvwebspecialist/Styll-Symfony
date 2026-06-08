'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

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
    const endMin   = new Date(appt.end_time).getHours()   * 60 + new Date(appt.end_time).getMinutes()
    if (startMin - cursor >= MIN_FREE_SLOT) count++
    cursor = Math.max(cursor, endMin)
  }
  if (WORK_END * 60 - cursor >= MIN_FREE_SLOT) count++
  return count
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function getTodayLabel(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface Props {
  staffName: string | null
  appointments: TodayAppointment[]
}

export function MobileHero({ staffName, appointments }: Props) {
  const [greeting, setGreeting] = React.useState('')
  const [dateLabel, setDateLabel] = React.useState('')

  React.useEffect(() => {
    setGreeting(getGreeting())
    setDateLabel(getTodayLabel())
  }, [])

  const firstName = staffName?.split(' ')[0] ?? null
  const active    = appointments.filter((a) => a.status !== 'cancelled')
  const count     = active.length
  const revenue   = active.reduce((s, a) => s + a.total_price, 0)
  const freeSlots = calcFreeSlotCount(active)

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* Saluto + data */}
      <p suppressHydrationWarning style={{
        margin: 0,
        fontSize: 24,
        fontWeight: 700,
        color: '#111111',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.5px',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {greeting}{firstName ? `, ${firstName}` : ''}
      </p>
      <p suppressHydrationWarning style={{
        margin: '3px 0 0',
        fontSize: 14,
        fontWeight: 400,
        color: '#9CA3AF',
        fontFamily: 'Outfit, sans-serif',
        textTransform: 'capitalize',
        lineHeight: 1.3,
      }}>
        {dateLabel}
      </p>

      {/* KPI inline strip — 3 values in one row */}
      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        marginTop: 14,
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #F0F0F0',
        overflow: 'hidden',
      }}>
        <KpiCell value={count} label={count === 1 ? 'appuntamento' : 'appuntamenti'} />
        <div style={{ width: 1, background: '#F0F0F0', flexShrink: 0 }} />
        <KpiCell value={`€${revenue}`} label="revenue stimata" />
        <div style={{ width: 1, background: '#F0F0F0', flexShrink: 0 }} />
        <KpiCell value={freeSlots} label={freeSlots === 1 ? 'slot libero' : 'slot liberi'} />
      </div>
    </div>
  )
}

function KpiCell({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{
      flex: 1,
      padding: '12px 0',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
    }}>
      <p style={{
        margin: 0,
        fontSize: 20,
        fontWeight: 800,
        color: '#111111',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.4px',
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{
        margin: 0,
        fontSize: 10,
        color: '#9CA3AF',
        fontFamily: 'Outfit, sans-serif',
        lineHeight: 1,
        textAlign: 'center',
      }}>
        {label}
      </p>
    </div>
  )
}
