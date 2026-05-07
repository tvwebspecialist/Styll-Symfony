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

function fmtMonthYear(d: Date): string {
  const month = d.toLocaleDateString('it-IT', { month: 'long' })
  return `${month.charAt(0).toUpperCase() + month.slice(1)}, ${d.getFullYear()}`
}

function fmtSelectedLabel(d: Date): string {
  const month = d.toLocaleDateString('it-IT', { month: 'long' })
  return `${d.getDate()} ${month.charAt(0).toUpperCase() + month.slice(1)}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
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

  const dayAppts = weekOffset === 0
    ? weekAppointments.filter(a => a.start_time.slice(0, 10) === selectedDateStr)
    : []

  const arrowStyle: React.CSSProperties = {
    width: 32,
    height: 32,
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    background: '#FFFFFF',
    cursor: 'pointer',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#222222',
    flexShrink: 0,
    transition: 'background 150ms ease',
  }

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E9E9E9',
        borderRadius: 20,
        padding: 20,
        fontFamily: 'Outfit, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header: "Maggio, 2026" + arrows ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: '#222222',
          fontFamily: 'Outfit, sans-serif',
        }}>
          {fmtMonthYear(weekDates[0])}
        </h2>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            style={arrowStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            style={arrowStyle}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Day labels row: Lun Mar Mer Gio Ven Sab Dom ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 8 }}>
        {DAY_LABELS.map(d => (
          <div
            key={d}
            style={{
              fontSize: 12,
              fontWeight: 500,
              textAlign: 'center',
              color: '#9CA3AF',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Date numbers grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 20 }}>
        {weekDates.map((date, i) => {
          const isSelected = selectedIdx === i
          const isToday = date.toISOString().slice(0, 10) === todayStr && weekOffset === 0

          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: isSelected ? 'none' : '1px solid #E5E7EB',
                borderRadius: 8,
                background: isSelected ? '#111827' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#222222',
                fontSize: 14,
                fontWeight: isToday ? 700 : 500,
                cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                boxSizing: 'border-box',
                transition: 'background 150ms ease, color 150ms ease',
                outline: isToday && !isSelected ? '2px solid #111827' : 'none',
                outlineOffset: -2,
              }}
            >
              {date.getDate()}
            </button>
          )
        })}
      </div>

      {/* ── Selected date label + subtitle ── */}
      <div style={{ marginBottom: 12 }}>
        <p style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: '#222222',
          fontFamily: 'Outfit, sans-serif',
        }}>
          {fmtSelectedLabel(selectedDate)}
        </p>
        <p style={{
          margin: '2px 0 0',
          fontSize: 12,
          fontWeight: 500,
          color: '#9CA3AF',
          fontFamily: 'Outfit, sans-serif',
        }}>
          Orario Appuntamenti
        </p>
      </div>

      {/* ── Appointments list ── */}
      <div style={{ flex: 1, marginBottom: 16 }}>
        {dayAppts.length === 0 ? (
          <p style={{
            fontSize: 13,
            color: '#9CA3AF',
            margin: 0,
            fontFamily: 'Outfit, sans-serif',
          }}>
            {weekOffset !== 0 ? 'Apri il calendario per vedere questa settimana' : 'Nessun appuntamento'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 150, overflowY: 'auto' }}>
            {dayAppts.slice(0, 5).map(a => (
              <div
                key={a.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '7px 0',
                  borderBottom: '1px solid #F3F4F6',
                }}
              >
                <span style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  minWidth: 42,
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {fmtTime(a.start_time)}
                </span>
                <span style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#222222',
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: 'Outfit, sans-serif',
                  lineHeight: 1.4,
                }}>
                  {a.client_name}
                </span>
              </div>
            ))}
            {dayAppts.length > 5 && (
              <p style={{ fontSize: 12, color: '#9CA3AF', margin: '6px 0 0', fontFamily: 'Outfit, sans-serif' }}>
                +{dayAppts.length - 5} altri
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── CTA button ── */}
      <button
        onClick={() => router.push(`${basePath}/calendario?date=${selectedDateStr}`)}
        style={{
          width: '100%',
          padding: '10px 16px',
          background: '#111827',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1F2937' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#111827' }}
      >
        Vedi dettagli
      </button>
    </div>
  )
}
