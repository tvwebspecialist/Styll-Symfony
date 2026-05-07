'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

// 6 giorni Lun–Sab, come il calendario principale
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
  const idx = dow === 0 ? 6 : dow - 1 // 0=Lun … 6=Dom
  return Math.min(idx, 5) // clamp a Sab se oggi è domenica
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
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Colori avatar deterministici basati sul nome
const AVATAR_COLORS = ['#dbeafe', '#ede9fe', '#dcfce7', '#ffedd5', '#fce7f3', '#e0f2fe']
const AVATAR_TEXT   = ['#1e40af', '#6d28d9', '#15803d', '#c2410c', '#be185d', '#0369a1']
function avatarColor(name: string): { bg: string; text: string } {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return { bg: AVATAR_COLORS[idx]!, text: AVATAR_TEXT[idx]! }
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
    ? weekAppointments.filter(a => a.start_time.slice(0, 10) === selectedDateStr)
    : []

  function goToCalendar() {
    router.push(`${basePath}/calendario?date=${selectedDateStr}`)
  }

  return (
    <div className="mini-calendar-wrap" style={{
      background: '#FFFFFF',
      border: '1px solid #E9E9E9',
      borderRadius: 20,
      padding: '20px 20px 16px',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
    }}>

      {/* ── HEADER: "Maggio, 2026" + < > ─────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: '#111827',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.5px',
          lineHeight: 1,
        }}>
          {fmtMonthYear(weekDates[0]!)}
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {([[-1, '‹'], [1, '›']] as const).map(([dir, icon]) => (
            <button
              key={dir}
              onClick={() => setWeekOffset(o => o + dir)}
              style={{
                width: 36, height: 36,
                border: '1px solid #E5E7EB',
                borderRadius: '50%',
                background: '#FFFFFF',
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#374151',
                flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── 6-DAY SELECTOR ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginBottom: 12 }}>
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
                gap: 4,
                border: isSelected ? 'none' : '1px solid #E9E9E9',
                borderRadius: 12,
                background: isSelected ? '#111827' : '#FFFFFF',
                cursor: 'pointer',
                transition: 'background 150ms ease',
                outline: isToday && !isSelected ? '2px solid #111827' : 'none',
                outlineOffset: -2,
              }}
            >
              <span className="mini-calendar-day-label" style={{
                fontSize: 11,
                fontWeight: 500,
                color: isSelected ? 'rgba(255,255,255,0.6)' : '#9CA3AF',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
              }}>
                {DAY_LABELS[i]}
              </span>
              <span className="mini-calendar-day-number" style={{
                fontSize: 20,
                fontWeight: 700,
                color: isSelected ? '#FFFFFF' : '#111827',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
              }}>
                {date.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── "AGGIUNGI APPUNTAMENTO" BAR ───────────────────── */}
      <button
        onClick={goToCalendar}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #E9E9E9',
          borderRadius: 10,
          padding: '10px 14px',
          background: '#FFFFFF',
          cursor: 'pointer',
          marginBottom: 16,
          width: '100%',
          boxSizing: 'border-box',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', fontFamily: 'Outfit, sans-serif' }}>
          Aggiungi appuntamento
        </span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Sync icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          {/* Export icon */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
      </button>

      {/* ── "18 Maggio" LABEL ─────────────────────────────── */}
      <p style={{
        margin: '0 0 12px',
        fontSize: 20,
        fontWeight: 700,
        color: '#111827',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.3px',
      }}>
        {fmtSelectedLabel(selectedDate)}
      </p>

      {/* ── TABLE HEADER: Orario | Appuntamenti | Tutti ───── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', width: 48, flexShrink: 0, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Orario
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', flex: 1, fontFamily: 'Outfit, sans-serif', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          Appuntamenti
        </span>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 10px',
          border: '1px solid #E5E7EB',
          borderRadius: 6,
          background: '#FFFFFF',
          fontSize: 12,
          fontWeight: 500,
          color: '#374151',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
        }}>
          Tutti
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>

      {/* ── APPOINTMENT ROWS ──────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 260, marginBottom: 12 }}>
        {dayAppts.length === 0 ? (
          <p style={{
            fontSize: 13,
            color: '#9CA3AF',
            margin: 0,
            padding: '16px 0',
            fontFamily: 'Outfit, sans-serif',
            textAlign: 'center',
          }}>
            {weekOffset !== 0 ? 'Apri il calendario per questa settimana' : 'Nessun appuntamento'}
          </p>
        ) : (
          dayAppts.map((appt, idx) => {
            const av = avatarColor(appt.client_name)
            const serviceLabel = appt.service_names.length > 0
              ? ` • ${appt.service_names.join(' + ')}`
              : ''
            const timeRange = `${fmtTime(appt.start_time)} - ${fmtTime(appt.end_time)}`

            return (
              <div
                key={appt.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 0',
                  borderBottom: idx < dayAppts.length - 1 ? '1px solid #F3F4F6' : 'none',
                }}
              >
                {/* Time */}
                <span style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#9CA3AF',
                  width: 38,
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                  lineHeight: 1,
                }}>
                  {fmtTime(appt.start_time)}
                </span>

                {/* Avatar */}
                <div style={{
                  width: 34, height: 34,
                  borderRadius: '50%',
                  background: av.bg,
                  color: av.text,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                  border: '1.5px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.06)',
                }}>
                  {getInitials(appt.client_name)}
                </div>

                {/* Name + sub */}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <p style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#111827',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1.3,
                  }}>
                    {appt.client_name}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: 11,
                    color: '#9CA3AF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1.3,
                  }}>
                    {timeRange}{serviceLabel}
                  </p>
                </div>

                {/* ··· menu */}
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#9CA3AF',
                  fontSize: 16,
                  padding: '0 2px',
                  flexShrink: 0,
                  letterSpacing: '1px',
                  lineHeight: 1,
                }}>
                  ···
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* ── "VISUALIZZA DETTAGLIO" BUTTON ─────────────────── */}
      <button
        onClick={goToCalendar}
        style={{
          width: '100%',
          padding: '11px 0',
          border: '1px solid #E9E9E9',
          borderRadius: 10,
          background: '#FFFFFF',
          fontSize: 14,
          fontWeight: 500,
          color: '#111827',
          cursor: 'pointer',
          fontFamily: 'Outfit, sans-serif',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
      >
        Visualizza dettaglio
      </button>

    </div>
  )
}
