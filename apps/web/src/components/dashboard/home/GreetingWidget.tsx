'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  staffName: string | null
  appointments: TodayAppointment[]
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buongiorno'
  if (h < 17) return 'Buon pomeriggio'
  return 'Buonasera'
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function todayFull(): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
}

export function GreetingWidget({ staffName, appointments }: Props) {
  const [greeting, setGreeting] = React.useState('Ciao')

  React.useEffect(() => {
    setGreeting(getGreeting())
  }, [])

  const firstName = staffName?.split(' ')[0] ?? null
  const initials = staffName ? getInitials(staffName) : '?'

  const completed = appointments.filter((a) => a.status === 'completed').length
  const total = appointments.filter((a) => a.status !== 'cancelled').length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: 20,
        padding: 20,
      }}
    >
      {/* Avatar + greeting */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#FFFFFF',
            fontFamily: 'Outfit, sans-serif',
            flexShrink: 0,
            letterSpacing: '0.3px',
          }}
        >
          {initials}
        </div>
        <div style={{ minWidth: 0 }}>
          <p
            suppressHydrationWarning
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 800,
              color: '#FFFFFF',
              fontFamily: 'Outfit, sans-serif',
              lineHeight: 1.15,
              letterSpacing: '-0.3px',
            }}
          >
            {greeting}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <p
            suppressHydrationWarning
            style={{
              margin: '3px 0 0',
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
              fontFamily: 'Outfit, sans-serif',
              textTransform: 'capitalize',
              lineHeight: 1,
            }}
          >
            {todayFull()}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      {total > 0 ? (
        <>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.15)',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#FFFFFF',
                borderRadius: 3,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {completed} di {total} appuntament{total === 1 ? 'o' : 'i'} completat{completed === 1 ? 'o' : 'i'}
          </p>
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          Nessun appuntamento per oggi — goditi la giornata! 🎉
        </p>
      )}
    </div>
  )
}
