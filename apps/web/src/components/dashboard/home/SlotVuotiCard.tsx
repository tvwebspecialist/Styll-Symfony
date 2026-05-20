'use client'

import * as React from 'react'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  appointments: TodayAppointment[]
}

interface FreeSlot {
  startMin: number
  durationMin: number
}

const WORK_START = 8
const WORK_END = 20
const MIN_FREE_SLOT = 30

function calcFreeSlots(appointments: TodayAppointment[]): FreeSlot[] {
  const sorted = [...appointments]
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const slots: FreeSlot[] = []
  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const s = new Date(appt.start_time)
    const e = new Date(appt.end_time)
    const startMin = s.getHours() * 60 + s.getMinutes()
    const endMin = e.getHours() * 60 + e.getMinutes()
    const gap = startMin - cursor
    if (gap >= MIN_FREE_SLOT) slots.push({ startMin: cursor, durationMin: gap })
    cursor = Math.max(cursor, endMin)
  }

  const trailing = WORK_END * 60 - cursor
  if (trailing >= MIN_FREE_SLOT) slots.push({ startMin: cursor, durationMin: trailing })
  return slots
}

function toTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function durLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

export function SlotVuotiCard({ appointments }: Props) {
  const slots = calcFreeSlots(appointments)

  return (
    <div
      aria-label="Slot vuoti oggi"
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#111111',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.2px',
          }}
        >
          Slot vuoti oggi
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#9CA3AF',
            fontFamily: 'Outfit, sans-serif',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {slots.length} slot
        </span>
      </div>

      {slots.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '12px 0',
          }}
        >
          <span style={{ fontSize: 28, lineHeight: 1 }}>🎉</span>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: '#111111',
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              textAlign: 'center',
            }}
          >
            Agenda piena
          </p>
          <p
            style={{
              fontSize: 12,
              color: '#9CA3AF',
              margin: 0,
              fontFamily: 'Outfit, sans-serif',
              textAlign: 'center',
            }}
          >
            Ottimo lavoro!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slots.slice(0, 4).map((slot, i) => {
            const endMin = slot.startMin + slot.durationMin
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: '#F9FAFB',
                  borderRadius: 10,
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#374151',
                      margin: 0,
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1.2,
                    }}
                  >
                    {toTime(slot.startMin)} – {toTime(endMin)}
                  </p>
                  <p
                    style={{
                      fontSize: 10,
                      color: '#9CA3AF',
                      margin: '2px 0 0',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {durLabel(slot.durationMin)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled
                  title="Disponibile nel piano Pro"
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#9CA3AF',
                    background: 'none',
                    border: '1px solid #E9E9E9',
                    borderRadius: 6,
                    cursor: 'not-allowed',
                    padding: '5px 8px',
                    flexShrink: 0,
                    fontFamily: 'Outfit, sans-serif',
                    whiteSpace: 'nowrap',
                    opacity: 0.7,
                  }}
                >
                  Notifica clienti
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
