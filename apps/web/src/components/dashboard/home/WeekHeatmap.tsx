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
  const bookedMap = new Map<string, Set<number>>()
  for (const slot of slots) {
    if (!slot.is_booked) continue
    const set = bookedMap.get(slot.date) ?? new Set<number>()
    set.add(slot.hour)
    bookedMap.set(slot.date, set)
  }

  const uniqueDates = Array.from(new Set(slots.map((s) => s.date))).sort().slice(0, 6)
  if (uniqueDates.length === 0) {
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
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: '20px 20px 18px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
          Occupazione settimanale
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#F1F5F9', border: '1px solid #E2E8F0', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>Libero</span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: '#111827', display: 'inline-block' }} />
            <span style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>Occupato</span>
          </span>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'flex', gap: 6 }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 22 }}>
          {hours.map((h) => (
            <div key={h} style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              {h % 2 === 1 ? (
                <span style={{ fontSize: 9, color: '#CBD5E1', width: 20, textAlign: 'right', fontFamily: 'Outfit, sans-serif' }}>
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
          <div key={date} style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textAlign: 'center', margin: '0 0 6px', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.04em' }}>
              {DAYS[di] ?? ''}
            </p>
            {hours.map((h) => {
              const booked = bookedMap.get(date)?.has(h) ?? false
              return (
                <div
                  key={h}
                  title={booked ? `${DAYS[di]} ${h}:00 — Occupato` : undefined}
                  style={{
                    height: 22,
                    borderRadius: 5,
                    background: booked ? '#111827' : '#F1F5F9',
                    opacity: booked ? 0.88 : 1,
                    transition: 'opacity 120ms',
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
