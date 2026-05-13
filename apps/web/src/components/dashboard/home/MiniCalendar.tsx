'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

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
  const idx = dow === 0 ? 6 : dow - 1
  return Math.min(idx, 5)
}

function fmtMonthYear(d: Date): string {
  const m = d.toLocaleDateString('it-IT', { month: 'long' })
  return `${m.charAt(0).toUpperCase() + m.slice(1)}, ${d.getFullYear()}`
}

function fmtSelectedLabel(d: Date): string {
  const m = d.toLocaleDateString('it-IT', { month: 'long' })
  return `${d.getDate()} ${m.charAt(0).toUpperCase() + m.slice(1)}`
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_BG   = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0f2fe']
const AVATAR_TEXT = ['#1e40af', '#6d28d9', '#15803d', '#c2410c', '#be185d', '#0369a1']
function avatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_BG.length
  return { bg: AVATAR_BG[idx]!, text: AVATAR_TEXT[idx]! }
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
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const todayStr       = new Date().toISOString().slice(0, 10)
  const selectedDate   = weekDates[selectedIdx]!
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)

  const dayAppts = weekOffset === 0
    ? weekAppointments.filter((a) => a.start_time.slice(0, 10) === selectedDateStr)
    : []

  function goToCalendar() {
    router.push(`${basePath}/calendario?date=${selectedDateStr}`)
  }

  return (
    <div
      className="mini-calendar-wrap"
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: '22px 20px 18px',
        fontFamily: 'Outfit, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      {/* ── Month header + arrows ───────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 26,
            fontWeight: 700,
            color: '#111827',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.6px',
            lineHeight: 1,
          }}
        >
          {fmtMonthYear(weekDates[0]!)}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {([[-1, '‹'], [1, '›']] as const).map(([dir, icon]) => (
            <button
              key={dir}
              onClick={() => setWeekOffset((o) => o + dir)}
              style={{
                width: 36,
                height: 36,
                border: '1px solid #E5E7EB',
                borderRadius: '50%',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#374151',
                flexShrink: 0,
                transition: 'background 120ms',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── Week strip — 6 day tiles ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 14 }}>
        {weekDates.map((date, i) => {
          const isSelected = selectedIdx === i
          const isToday    = date.toISOString().slice(0, 10) === todayStr && weekOffset === 0
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '10px 4px',
                height: 72,
                gap: 6,
                border: isSelected ? 'none' : '1px solid #F0F0F0',
                borderRadius: 12,
                background: isSelected ? '#111827' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'background 140ms ease',
                outline: isToday && !isSelected ? '2px solid #111827' : 'none',
                outlineOffset: -2,
              }}
            >
              <span
                className="mini-calendar-day-label"
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: isSelected ? 'rgba(255,255,255,0.55)' : '#9CA3AF',
                  fontFamily: 'Outfit, sans-serif',
                  lineHeight: 1,
                  letterSpacing: '0.03em',
                }}
              >
                {DAY_LABELS[i]}
              </span>
              <span
                className="mini-calendar-day-number"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: isSelected ? '#FFFFFF' : '#111827',
                  fontFamily: 'Outfit, sans-serif',
                  lineHeight: 1,
                }}
              >
                {date.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── "Aggiungi appuntamento" action bar ─────────────────── */}
      <button
        onClick={goToCalendar}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #F0F0F0',
          borderRadius: 10,
          padding: '10px 14px',
          background: '#FFFFFF',
          cursor: 'pointer',
          marginBottom: 16,
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 44,
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontFamily: 'Outfit, sans-serif' }}>
          Aggiungi appuntamento
        </span>
        {/* Sync + export icons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
          </svg>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
      </button>

      {/* ── Selected day label ──────────────────────────────────── */}
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 18,
          fontWeight: 700,
          color: '#111827',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.3px',
        }}
      >
        {fmtSelectedLabel(selectedDate)}
      </p>

      {/* ── Column headers ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: '1px solid #F3F4F6',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', width: 44, flexShrink: 0, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Orario
        </span>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', flex: 1, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Appuntamenti
        </span>
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 10px',
            border: '1px solid #E5E7EB',
            borderRadius: 7,
            background: '#FFFFFF',
            fontSize: 11,
            fontWeight: 600,
            color: '#374151',
            cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            minHeight: 28,
          }}
        >
          Tutti ▾
        </button>
      </div>

      {/* ── Appointment rows ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 300, marginBottom: 14 }}>
        {dayAppts.length === 0 ? (
          <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, padding: '20px 0', fontFamily: 'Outfit, sans-serif', textAlign: 'center' }}>
            {weekOffset !== 0 ? 'Apri il calendario per questa settimana' : 'Nessun appuntamento'}
          </p>
        ) : (
          dayAppts.map((appt, idx) => {
            const av = avatarColor(appt.client_name)
            const faded = appt.status === 'completed' || appt.status === 'cancelled'
            const serviceLabel = appt.service_names.length > 0
              ? ` · ${appt.service_names.join(' + ')}`
              : ''

            return (
              <div
                key={appt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: idx < dayAppts.length - 1 ? '1px solid #F3F4F6' : 'none',
                  opacity: faded ? 0.45 : 1,
                }}
              >
                {/* Time */}
                <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', width: 38, flexShrink: 0, fontFamily: 'ui-monospace, monospace', lineHeight: 1 }}>
                  {fmtTime(appt.start_time)}
                </span>

                {/* Avatar */}
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: av.bg,
                    color: av.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  {getInitials(appt.client_name)}
                </div>

                {/* Name + sub */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>
                    {appt.client_name}
                  </p>
                  <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>
                    {fmtTime(appt.start_time)} – {fmtTime(appt.end_time)}{serviceLabel}
                  </p>
                </div>

                {/* ··· */}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 14, padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>
                  ···
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── "Visualizza dettaglio" ──────────────────────────────── */}
      <button
        onClick={goToCalendar}
        style={{
          width: '100%',
          height: 44,
          border: '1px solid #F0F0F0',
          borderRadius: 10,
          background: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          color: '#111827',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          transition: 'background 120ms',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
      >
        Visualizza dettaglio →
      </button>
    </div>
  )
}
