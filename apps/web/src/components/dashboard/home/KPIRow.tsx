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
      label: 'Appuntamenti oggi',
      value: appointments.length > 0 ? String(appointments.length) : '–',
    },
    {
      label: 'Ricavi stimati',
      value: appointments.length > 0 ? `€${totalPrice}` : '–',
    },
    {
      label: 'Prossimo',
      value: next ? fmt(next.start_time) : '–',
    },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {pills.map((pill) => (
        <div
          key={pill.label}
          className="kpi-pill-card"
          style={{
            flex: '1 1 120px',
            background: '#FFFFFF',
            border: '1px solid #E9E9E9',
            borderRadius: 14,
            padding: '14px 20px',
          }}
        >
          <p className="kpi-pill-value" style={{ fontSize: 28, fontWeight: 700, color: '#222222', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
            {pill.value}
          </p>
          <p style={{ fontSize: 12, color: '#B0B0B0', margin: '4px 0 0', fontFamily: 'Outfit, sans-serif' }}>
            {pill.label}
          </p>
        </div>
      ))}
    </div>
  )
}
