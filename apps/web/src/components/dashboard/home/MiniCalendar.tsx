'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

function getWeekStart(weekOffset: number): Date {
  const today = new Date()
  const dow = today.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - daysFromMon)
  monday.setDate(monday.getDate() + weekOffset * 7)
  return monday
}

function todayDayIndex(): number {
  const dow = new Date().getDay()
  return dow === 0 ? 6 : dow - 1
}

interface Props {
  weekAppointments: TodayAppointment[]
  basePath: string
}

export function MiniCalendar({ weekAppointments, basePath }: Props) {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [selectedIdx, setSelectedIdx] = React.useState(todayDayIndex)

  const weekStart = getWeekStart(weekOffset)
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const todayStr = new Date().toISOString().slice(0, 10)
  const selectedDate = weekDates[selectedIdx]
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)

  const rawLabel = weekDates[0].toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  const monthYear = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  // Only show appointment data for the current week (weekOffset 0) — data not fetched for others
  const dayAppts = weekOffset === 0
    ? weekAppointments.filter(a => a.start_time.slice(0, 10) === selectedDateStr)
    : []

  function fmtTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }

  function fmtDayLabel(d: Date): string {
    return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E9E9E9',
        borderRadius: 20,
        padding: 20,
        fontFamily: 'Outfit, sans-serif',
      }}
    >
      {/* Header: month/year + nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#222222' }}>
          {monthYear}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            style={{
              width: 32, height: 32,
              border: '1px solid #E9E9E9',
              borderRadius: 8,
              background: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#374151',
            }}
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            style={{
              width: 32, height: 32,
              border: '1px solid #E9E9E9',
              borderRadius: 8,
              background: '#FFFFFF',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#374151',
            }}
          >
            ›
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, textAlign: 'center', color: '#9CA3AF' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16 }}>
        {weekDates.map((date, i) => {
          const isSelected = selectedIdx === i
          const isToday = date.toISOString().slice(0, 10) === todayStr && weekOffset === 0
          const hasAppts = weekOffset === 0 &&
            weekAppointments.some(a => a.start_time.slice(0, 10) === date.toISOString().slice(0, 10))

          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                padding: '7px 2px',
                border: isToday && !isSelected ? '1.5px solid #111827' : 'none',
                borderRadius: 10,
                background: isSelected ? '#111827' : 'transparent',
                color: isSelected ? '#FFFFFF' : '#222222',
                fontSize: 13,
                fontWeight: isSelected || isToday ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              {date.getDate()}
              {/* dot indicator for days with appointments */}
              <span
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: hasAppts
                    ? (isSelected ? '#FFFFFF' : '#6366F1')
                    : 'transparent',
                  flexShrink: 0,
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Selected date label */}
      <p style={{ fontSize: 13, fontWeight: 700, color: '#222222', margin: '0 0 10px' }}>
        {fmtDayLabel(selectedDate)}
      </p>

      {/* Appointments preview */}
      <div style={{ marginBottom: 14, minHeight: 56 }}>
        {dayAppts.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>
            {weekOffset !== 0 ? 'Apri il calendario per vedere questa settimana' : 'Nessun appuntamento'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {dayAppts.slice(0, 3).map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', minWidth: 38, flexShrink: 0 }}>
                  {fmtTime(a.start_time)}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#222222',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {a.client_name}
                </span>
              </div>
            ))}
            {dayAppts.length > 3 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
                +{dayAppts.length - 3} altri
              </p>
            )}
          </div>
        )}
      </div>

      {/* Add appointment — navigates to full calendar on selected date */}
      <button
        onClick={() => router.push(`${basePath}/calendario?date=${selectedDateStr}`)}
        style={{
          width: '100%',
          padding: '10px 0',
          background: '#111827',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        + Aggiungi appuntamento
      </button>
    </div>
  )
}
