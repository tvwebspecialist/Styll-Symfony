'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  staffName: string | null
  appointments: TodayAppointment[]
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 12) return 'Buongiorno'
  if (h >= 12 && h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function GreetingHeader({ staffName, appointments }: Props) {
  const [greeting, setGreeting] = React.useState<string | null>(null)

  React.useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  const firstName = staffName?.split(' ')[0] ?? null
  const active = appointments.filter((a) => a.status !== 'cancelled')
  const totalRevenue = active.reduce((s, a) => s + a.total_price, 0)

  const now = new Date()
  const nextAppt =
    [...active]
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .find((a) => new Date(a.end_time) > now && a.status !== 'completed') ?? null

  const minutesUntilNext = nextAppt
    ? Math.round((new Date(nextAppt.start_time).getTime() - now.getTime()) / 60000)
    : null

  const subtitleParts: string[] = []
  if (active.length === 0) {
    subtitleParts.push('Nessun appuntamento oggi')
  } else {
    subtitleParts.push(`Oggi hai ${active.length} appuntament${active.length === 1 ? 'o' : 'i'}`)
  }
  if (totalRevenue > 0) subtitleParts.push(`Revenue prevista: €${totalRevenue}`)
  if (nextAppt) {
    const timeStr = fmt(nextAppt.start_time)
    if (minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext < 120) {
      subtitleParts.push(`Prossimo: ${nextAppt.client_name} alle ${timeStr} (tra ${minutesUntilNext} min)`)
    } else {
      subtitleParts.push(`Prossimo: ${nextAppt.client_name} alle ${timeStr}`)
    }
  }

  return (
    <div className="dashboard-home-greeting" style={{ paddingBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <p
          suppressHydrationWarning
          className="dashboard-greeting-title"
          style={{
            margin: 0,
            fontSize: 50,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-2px',
            lineHeight: 1,
            color: '#9CA3AF',
          }}
        >
          {greeting ?? 'Ciao'},
        </p>
        <p
          className="dashboard-greeting-title"
          style={{
            margin: 0,
            fontSize: 50,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-2px',
            lineHeight: 1,
            color: '#111111',
          }}
        >
          {firstName ?? 'Barbiere'}
        </p>
      </div>
      <p
        suppressHydrationWarning
        className="dashboard-greeting-sub"
        style={{
          margin: '10px 0 0',
          fontSize: 14,
          fontWeight: 500,
          color: '#6B7280',
          fontFamily: 'Outfit, sans-serif',
          lineHeight: 1.5,
        }}
      >
        {subtitleParts.join(' · ')}
      </p>
    </div>
  )
}
