'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface KPIRowProps {
  appointments: TodayAppointment[]
}

function fmt(t: string): string {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function KPIRow({ appointments }: KPIRowProps) {
  const totalPrice = appointments.reduce((s, a) => s + a.total_price, 0)
  const next = appointments.find((a) => new Date(a.start_time) > new Date())

  const pills = [
    {
      label: 'Appuntamenti',
      value: appointments.length > 0 ? String(appointments.length) : '–',
      hasData: appointments.length > 0,
    },
    {
      label: 'Ricavi stimati',
      value: appointments.length > 0 ? `€ ${totalPrice}` : '–',
      hasData: appointments.length > 0,
    },
    {
      label: 'Prossimo',
      value: next ? fmt(next.start_time) : '–',
      hasData: !!next,
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        /* minWidth: max-content ensures mobile scroll works in .home-kpi-scroll */
        minWidth: 'max-content',
      }}
    >
      {pills.map((pill) => (
        <div
          key={pill.label}
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            padding: '12px 16px',
            /* Desktop: equal thirds via flex on the container; Mobile: fixed min-width */
            minWidth: 120,
            flex: '1 1 0',
            maxHeight: 72,
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#9CA3AF',
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {pill.label}
          </p>
          <p
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: pill.hasData ? '#111111' : '#CBD5E1',
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            {pill.value}
          </p>
        </div>
      ))}
    </div>
  )
}
