'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointments: TodayAppointment[]
}

export function KPIGridWidget({ appointments }: Props) {
  const active = appointments.filter((a) => a.status !== 'cancelled')
  const confirmed = active.filter((a) => a.status === 'confirmed').length
  const pending = active.filter((a) => a.status === 'pending').length
  const revenue = active.reduce((s, a) => s + a.total_price, 0)
  const total = active.length
  const confirmRate =
    confirmed + pending > 0 ? Math.round((confirmed / (confirmed + pending)) * 100) : null

  const kpis = [
    {
      label: 'Ricavi oggi',
      value: total > 0 ? `€${revenue}` : '–',
    },
    {
      label: 'Appuntamenti',
      value: total > 0 ? String(total) : '–',
    },
    {
      label: 'Confermati',
      value: confirmRate !== null ? `${confirmRate}%` : '–',
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
      }}
    >
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          style={{
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
            borderRadius: 14,
            padding: '14px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 600,
              color: '#B0B0B0',
              fontFamily: 'Outfit, sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              lineHeight: 1,
            }}
          >
            {kpi.label}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 800,
              color: '#222222',
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  )
}
