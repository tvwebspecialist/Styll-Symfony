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

function getCountdown(start: string, end: string): string | null {
  const now = Date.now()
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (now >= startMs && now < endMs) return 'In corso'
  const diffMin = Math.round((startMs - now) / 60000)
  if (diffMin <= 0 || diffMin >= 240) return null
  return `Tra ${diffMin} min`
}

export function ProssimoAppCard({ appointment, basePath }: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!appointment) return
    const update = () =>
      setCountdown(getCountdown(appointment.start_time, appointment.end_time))
    update()
    const id = setInterval(update, 60000)
    return () => clearInterval(id)
  }, [appointment])

  if (!appointment) {
    return (
      <div
        aria-label="Nessun altro appuntamento oggi"
        style={{
          background: '#111827',
          borderRadius: 20,
          border: '1px solid #111827',
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          height: '100%',
          boxSizing: 'border-box',
          textAlign: 'center',
          minHeight: 140,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          Nessun altro appuntamento oggi 🎉
        </p>
      </div>
    )
  }

  const services = appointment.service_names.join(' + ')
  const durationMin = Math.round(
    (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) /
      60000,
  )

  return (
    <div
      aria-label={`Prossimo appuntamento: ${appointment.client_name} alle ${fmt(appointment.start_time)}`}
      style={{
        background: '#111827',
        borderRadius: 20,
        border: '1px solid #111827',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        height: '100%',
        boxSizing: 'border-box',
        color: '#FFFFFF',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.45)',
            fontFamily: 'Outfit, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Prossimo
        </p>
        {countdown && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.7)',
              fontFamily: 'Outfit, sans-serif',
              background: 'rgba(255,255,255,0.1)',
              padding: '3px 9px',
              borderRadius: 99,
            }}
          >
            {countdown}
          </span>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 36,
              fontWeight: 800,
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-1px',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
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
              padding: '4px 10px',
              flexShrink: 0,
            }}
          >
            {durationMin} min
          </span>
        </div>
        <p
          style={{
            margin: '6px 0 0',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.3px',
            lineHeight: 1.2,
          }}
        >
          {appointment.client_name}
        </p>
        <p
          style={{
            margin: '3px 0 0',
            fontSize: 12,
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          {services || 'Servizio non specificato'} · €{appointment.total_price}
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push(`${basePath}/clienti/${appointment.client_id}`)}
        style={{
          marginTop: 'auto',
          padding: '10px 0',
          border: 'none',
          background: '#FFFFFF',
          color: '#111827',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          minHeight: 40,
        }}
      >
        Vedi profilo
      </button>
    </div>
  )
}
