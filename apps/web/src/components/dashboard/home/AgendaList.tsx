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

function statusIcon(status: string): { icon: string; color: string } {
  if (status === 'completed') return { icon: '✓', color: '#16A34A' }
  if (status === 'confirmed') return { icon: '→', color: '#222222' }
  return { icon: '○', color: '#B0B0B0' }
}

function todayLabel(): string {
  return new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function AgendaList({ appointments, basePath }: Props) {
  // Build list items interleaving free slots
  const items: Array<
    | { type: 'appt'; appt: TodayAppointment }
    | { type: 'free'; startMin: number; durationMin: number }
  > = []

  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  )

  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const startMin = new Date(appt.start_time).getHours() * 60 + new Date(appt.start_time).getMinutes()
    const endMin = new Date(appt.end_time).getHours() * 60 + new Date(appt.end_time).getMinutes()
    const gap = startMin - cursor
    if (gap >= MIN_FREE_SLOT) {
      items.push({ type: 'free', startMin: cursor, durationMin: gap })
    }
    items.push({ type: 'appt', appt })
    cursor = endMin
  }

  const trailingGap = WORK_END * 60 - cursor
  if (trailingGap >= MIN_FREE_SLOT) {
    items.push({ type: 'free', startMin: cursor, durationMin: trailingGap })
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#222222', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Agenda del giorno
        </p>
        <p style={{ fontSize: 12, color: '#B0B0B0', margin: 0, textTransform: 'capitalize' }}>
          {todayLabel()}
        </p>
      </div>

      {/* Items */}
      {items.length === 0 && (
        <p style={{ fontSize: 14, color: '#B0B0B0', textAlign: 'center', padding: '24px 0' }}>
          Nessun appuntamento oggi
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => {
          if (item.type === 'free') {
            const hours = Math.floor(item.durationMin / 60)
            const mins = item.durationMin % 60
            const label = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`
            return (
              <div
                key={`free-${i}`}
                style={{
                  border: '1px dashed #E0E0E0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 13, color: '#B0B0B0' }}>
                  Slot libero · {label}
                </span>
                <span style={{ fontSize: 12, color: '#B0B0B0', cursor: 'pointer', textDecoration: 'underline' }}>
                  Notifica clienti
                </span>
              </div>
            )
          }

          const { appt } = item
          const { icon, color } = statusIcon(appt.status)
          const isCompleted = appt.status === 'completed'
          const isCancelled = appt.status === 'cancelled'

          return (
            <div
              key={appt.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                cursor: 'pointer',
                opacity: isCompleted || isCancelled ? 0.5 : 1,
              }}
              onClick={() => {}}
            >
              <span style={{ fontSize: 14, color, fontWeight: 700, width: 16, textAlign: 'center', flexShrink: 0 }}>
                {icon}
              </span>
              <span style={{ fontSize: 13, color: '#B0B0B0', width: 42, flexShrink: 0 }}>
                {fmt(appt.start_time)}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#222222', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appt.client_name}
              </span>
              <span style={{ fontSize: 12, color: '#B0B0B0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
                {appt.service_names[0] ?? ''}
              </span>
              {isCompleted && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
                  Completato
                </span>
              )}
              {isCancelled && (
                <span style={{ fontSize: 11, fontWeight: 600, background: '#fee2e2', color: '#dc2626', borderRadius: 6, padding: '2px 6px', flexShrink: 0 }}>
                  Cancellato
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
