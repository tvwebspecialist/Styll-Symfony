'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointments: TodayAppointment[]
  basePath: string
}

const WORK_START = 8
const WORK_END = 20
const MIN_FREE_SLOT = 45

function fmt(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function statusBadge(status: string): { icon: string; color: string } {
  if (status === 'completed') return { icon: '✓', color: '#16A34A' }
  if (status === 'confirmed') return { icon: '→', color: '#374151' }
  if (status === 'cancelled') return { icon: '✕', color: '#EF4444' }
  return { icon: '○', color: '#D1D5DB' }
}

function todayLabel(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function AgendaList({ appointments, basePath: _basePath }: Props) {
  type Item =
    | { type: 'appt'; appt: TodayAppointment }
    | { type: 'free'; startMin: number; durationMin: number }

  const items: Item[] = []

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const startMin = new Date(appt.start_time).getHours() * 60 + new Date(appt.start_time).getMinutes()
    const endMin = new Date(appt.end_time).getHours() * 60 + new Date(appt.end_time).getMinutes()
    const gap = startMin - cursor
    if (gap >= MIN_FREE_SLOT) items.push({ type: 'free', startMin: cursor, durationMin: gap })
    items.push({ type: 'appt', appt })
    cursor = endMin
  }

  const trailingGap = WORK_END * 60 - cursor
  if (trailingGap >= MIN_FREE_SLOT) items.push({ type: 'free', startMin: cursor, durationMin: trailingGap })

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.06)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        padding: '20px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
          Agenda del giorno
        </p>
        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, textTransform: 'capitalize', fontFamily: 'Outfit, sans-serif' }}>
          {todayLabel()}
        </p>
      </div>

      {/* Items */}
      {items.length === 0 && (
        <p style={{ fontSize: 14, color: '#D1D5DB', textAlign: 'center', padding: '28px 0', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Nessun appuntamento oggi
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item, i) => {
          if (item.type === 'free') {
            const h = Math.floor(item.durationMin / 60)
            const m = item.durationMin % 60
            const label = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
            return (
              <div
                key={`free-${i}`}
                style={{
                  border: '1px dashed #E5E7EB',
                  borderRadius: 10,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 44,
                }}
              >
                <span style={{ fontSize: 12, color: '#D1D5DB', fontFamily: 'Outfit, sans-serif' }}>
                  Slot libero · {label}
                </span>
                <span style={{ fontSize: 12, color: '#D1D5DB', cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}>
                  Notifica
                </span>
              </div>
            )
          }

          const { appt } = item
          const { icon, color } = statusBadge(appt.status)
          const faded = appt.status === 'completed' || appt.status === 'cancelled'

          return (
            <div
              key={appt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 12px',
                borderRadius: 10,
                minHeight: 44,
                cursor: 'pointer',
                opacity: faded ? 0.45 : 1,
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { if (!faded) (e.currentTarget as HTMLDivElement).style.background = '#F9FAFB' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
            >
              {/* Status icon */}
              <span style={{ fontSize: 13, color, fontWeight: 700, width: 14, textAlign: 'center', flexShrink: 0, lineHeight: 1 }}>
                {icon}
              </span>

              {/* Time */}
              <span style={{ fontSize: 12, color: '#9CA3AF', width: 40, flexShrink: 0, fontFamily: 'Outfit, sans-serif', fontWeight: 500, letterSpacing: '-0.1px' }}>
                {fmt(appt.start_time)}
              </span>

              {/* Client name */}
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111111', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif' }}>
                {appt.client_name}
              </span>

              {/* Service */}
              <span style={{ fontSize: 12, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110, flexShrink: 0, fontFamily: 'Outfit, sans-serif' }}>
                {appt.service_names[0] ?? ''}
              </span>

              {/* Price */}
              <span style={{ fontSize: 13, color: '#374151', fontWeight: 600, flexShrink: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
                €{appt.total_price}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
