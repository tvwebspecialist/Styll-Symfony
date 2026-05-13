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
const MIN_FREE_SLOT = 45

function calcFreeSlots(appointments: TodayAppointment[]): FreeSlot[] {
  const sorted = [...appointments]
    .filter((a) => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

  const slots: FreeSlot[] = []
  let cursor = WORK_START * 60

  for (const appt of sorted) {
    const h = new Date(appt.start_time).getHours()
    const m = new Date(appt.start_time).getMinutes()
    const startMin = h * 60 + m
    const eh = new Date(appt.end_time).getHours()
    const em = new Date(appt.end_time).getMinutes()
    const endMin = eh * 60 + em
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

export function FreeSlotsCard({ appointments }: Props) {
  const slots = calcFreeSlots(appointments)

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
          Slot liberi
        </p>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          oggi
        </span>
      </div>

      {/* Content */}
      {slots.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '16px 0',
          }}
        >
          <span style={{ fontSize: 32, lineHeight: 1 }}>🎉</span>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
            Agenda piena oggi
          </p>
          <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0, fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
            Ottimo lavoro!
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {slots.map((slot, i) => {
            const endMin = slot.startMin + slot.durationMin
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#F9FAFB',
                  borderRadius: 10,
                  gap: 8,
                  minHeight: 44,
                }}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px', lineHeight: 1.2 }}>
                    {toTime(slot.startMin)} – {toTime(endMin)}
                  </p>
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', fontFamily: 'Outfit, sans-serif' }}>
                    {durLabel(slot.durationMin)}
                  </p>
                </div>
                <button
                  type="button"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#6366f1',
                    background: 'none',
                    border: '1px solid #e0e7ff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    padding: '6px 12px',
                    flexShrink: 0,
                    fontFamily: 'Outfit, sans-serif',
                    minHeight: 32,
                    whiteSpace: 'nowrap',
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
