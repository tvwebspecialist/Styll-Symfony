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

  // Build subtitle from real data
  let subtitle = ''
  if (active.length === 0) {
    subtitle = 'Iniziamo a personalizzare la tua zona di lavoro!'
  } else {
    const parts: string[] = [
      `Oggi hai ${active.length} appuntament${active.length === 1 ? 'o' : 'i'}`,
    ]
    if (totalRevenue > 0) parts.push(`Revenue prevista: €${totalRevenue}`)
    if (nextAppt) {
      const timeStr = fmt(nextAppt.start_time)
      const minText =
        minutesUntilNext !== null && minutesUntilNext > 0 && minutesUntilNext < 120
          ? ` (tra ${minutesUntilNext} min)`
          : ''
      parts.push(`⚡ Prossimo: ${nextAppt.client_name} alle ${timeStr}${minText}`)
    }
    subtitle = parts.join(' · ')
  }

  return (
    <div className="dashboard-home-greeting" style={{ paddingBottom: 4 }}>
      {/* "Ciao, [Nome]" — Outfit ExtraBold 50px */}
      <p
        suppressHydrationWarning
        className="dashboard-greeting-title"
        style={{
          margin: 0,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 50,
          fontWeight: 800,
          letterSpacing: '-1.25px',
          lineHeight: 1.1,
          color: '#222222',
        }}
      >
        <span>{greeting ?? 'Ciao'}, </span>
        <span>{firstName ?? 'Barbiere'}</span>
      </p>

      {/* Subtitle — Outfit Medium 20px */}
      <p
        suppressHydrationWarning
        className="dashboard-greeting-sub"
        style={{
          margin: '8px 0 0',
          fontFamily: 'Outfit, sans-serif',
          fontSize: 20,
          fontWeight: 500,
          color: '#222222',
          lineHeight: 1.4,
        }}
      >
        {subtitle}
      </p>
    </div>
  )
}
