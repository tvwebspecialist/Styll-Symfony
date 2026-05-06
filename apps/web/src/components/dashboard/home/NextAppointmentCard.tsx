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
  if (now >= startMs && now < endMs) {
    return `In corso · termina alle ${fmt(end)}`
  }
  const diffMin = Math.round((startMs - now) / 60000)
  if (diffMin <= 0) return ''
  if (diffMin < 120) return `tra ${diffMin} minut${diffMin === 1 ? 'o' : 'i'}`
  return ''
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
          background: '#222222',
          borderRadius: 20,
          padding: 24,
          color: '#FFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 260,
        }}
      >
        <p style={{ fontSize: 18, fontWeight: 600, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Nessun appuntamento
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Nessun appuntamento rimanente oggi
        </p>
      </div>
    )
  }

  const services = appointment.service_names.join(' + ')

  return (
    <div
      style={{
        background: '#222222',
        borderRadius: 20,
        padding: 24,
        color: '#FFF',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Time + duration */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            fontSize: 40,
            fontWeight: 800,
            fontFamily: 'Outfit, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {fmt(appointment.start_time)}
        </span>
        {appointment.end_time && (
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: 99,
              padding: '4px 12px',
            }}
          >
            {Math.round(
              (new Date(appointment.end_time).getTime() - new Date(appointment.start_time).getTime()) / 60000,
            )}{' '}
            min
          </span>
        )}
      </div>

      {/* Countdown */}
      {countdown && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0 }}>{countdown}</p>
      )}

      {/* Client + services */}
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          {appointment.client_name}
        </p>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>
          {services || 'Servizio non specificato'} · €{appointment.total_price}
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 'auto', paddingTop: 8 }}>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/clienti/${appointment.client_id}`)}
          style={{
            flex: 1,
            padding: '10px 0',
            border: '1px solid rgba(255,255,255,0.4)',
            background: 'transparent',
            color: '#FFF',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
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
            color: '#222222',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          Conferma ✓
        </button>
      </div>
    </div>
  )
}
