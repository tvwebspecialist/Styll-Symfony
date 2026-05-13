'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointment: TodayAppointment | null
  basePath: string
}

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function getCountdown(start: string, end: string): string {
  const now = Date.now()
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (now >= startMs && now < endMs) return `In corso · termina alle ${fmt(end)}`
  const diffMin = Math.round((startMs - now) / 60000)
  if (diffMin <= 0 || diffMin >= 120) return ''
  return `tra ${diffMin} minut${diffMin === 1 ? 'o' : 'i'}`
}

export function NextAppointmentCard({ appointment, basePath }: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = React.useState('')

  React.useEffect(() => {
    if (!appointment) return
    const update = () => setCountdown(getCountdown(appointment.start_time, appointment.end_time))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [appointment])

  if (!appointment) {
    return (
      <div
        style={{
          background: '#111827',
          borderRadius: 16,
          padding: '24px 24px',
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 120,
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 600, margin: 0, fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.5)' }}>
          Nessun appuntamento rimanente oggi
        </p>
      </div>
    )
  }

  const services = appointment.service_names.join(' + ')
  const durationMin = Math.round(
    (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000,
  )

  return (
    <div
      style={{
        background: '#111827',
        borderRadius: 16,
        padding: '22px 24px',
        color: '#FFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Time + duration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 38,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-1px',
            lineHeight: 1,
          }}
        >
          {fmt(appointment.start_time)}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(255,255,255,0.12)',
            borderRadius: 99,
            padding: '4px 12px',
            flexShrink: 0,
          }}
        >
          {durationMin} min
        </span>
        {countdown && (
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 'auto', flexShrink: 0 }}>
            {countdown}
          </span>
        )}
      </div>

      {/* Client + services + price */}
      <div>
        <p style={{ fontSize: 18, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.3px' }}>
          {appointment.client_name}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '3px 0 0', fontFamily: 'Outfit, sans-serif' }}>
          {services || 'Servizio non specificato'} · €{appointment.total_price}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/clienti/${appointment.client_id}`)}
          style={{
            flex: 1,
            padding: '10px 0',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.85)',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            minHeight: 44,
          }}
        >
          Profilo
        </button>
        <button
          type="button"
          style={{
            flex: 2,
            padding: '10px 0',
            border: 'none',
            background: '#FFFFFF',
            color: '#111827',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            minHeight: 44,
          }}
        >
          Conferma ✓
        </button>
      </div>
    </div>
  )
}
