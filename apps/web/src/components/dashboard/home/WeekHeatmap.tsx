'use client'

import * as React from 'react'
import type { WeekSlot } from '@/lib/actions/dashboard-home'

interface Props {
  slots: WeekSlot[]
}

const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const HOUR_START = 9
const HOUR_END = 18

export function WeekHeatmap({ slots }: Props) {
  // Build a map: dateStr → Set<hour>
  const bookedMap = new Map<string, Set<number>>()
  for (const slot of slots) {
    if (!slot.is_booked) continue
    const set = bookedMap.get(slot.date) ?? new Set<number>()
    set.add(slot.hour)
    bookedMap.set(slot.date, set)
  }

  // Get Mon–Sat dates from slots
  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort().slice(0, 6)
  if (uniqueDates.length === 0) {
    // Fallback: current week
    const now = new Date()
    const dow = now.getDay()
    const daysFromMon = dow === 0 ? 6 : dow - 1
    const mon = new Date(now.getTime() - daysFromMon * 86400000)
    for (let i = 0; i < 6; i++) {
      uniqueDates.push(new Date(mon.getTime() + i * 86400000).toISOString().slice(0, 10))
    }
  }

  const hours: number[] = []
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h)

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        padding: 20,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#222222', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Occupazione settimanale
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F5F5F5', border: '1px solid #E9E9E9', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#B0B0B0' }}>Libero</span>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#222222', display: 'inline-block', marginLeft: 8 }} />
          <span style={{ fontSize: 11, color: '#B0B0B0' }}>Occupato</span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingTop: 18 }}>
          {hours.map((h) => (
            <div
              key={h}
              style={{
                height: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              {h % 2 === 1 ? (
                <span style={{ fontSize: 10, color: '#B0B0B0', width: 20, textAlign: 'right' }}>
                  {String(h).padStart(2, '0')}
                </span>
              ) : (
                <span style={{ width: 20 }} />
              )}
            </div>
          ))}
        </div>

        {/* Day columns */}
        {uniqueDates.map((date, di) => (
          <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {/* Day label */}
            <p style={{ fontSize: 10, color: '#B0B0B0', textAlign: 'center', margin: '0 0 5px', fontFamily: 'Outfit, sans-serif' }}>
              {DAYS[di] ?? ''}
            </p>
            {/* Hour cells */}
            {hours.map((h) => {
              const isBooked = bookedMap.get(date)?.has(h) ?? false
              return (
                <div
                  key={h}
                  title={isBooked ? `${DAYS[di]} ${h}:00 — Occupato` : undefined}
                  style={{
                    height: 18,
                    borderRadius: 4,
                    background: isBooked ? '#222222' : '#F5F5F5',
                    opacity: isBooked ? 0.85 : 1,
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
