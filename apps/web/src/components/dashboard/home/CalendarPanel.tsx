'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, FileDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface Props {
  todayAppointments: TodayAppointment[]
  weekAppointments: TodayAppointment[]
  basePath: string
}

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const SHORT_DAYS = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

function fmtTime(t: string) {
  return new Date(t).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getWeekDays(ref: Date): Date[] {
  const dow = ref.getDay()
  const daysFromMon = dow === 0 ? 6 : dow - 1
  const monday = new Date(ref)
  monday.setDate(ref.getDate() - daysFromMon)
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

function apptStatus(appt: TodayAppointment, today: boolean): 'past' | 'current' | 'upcoming' {
  if (!today) return 'upcoming'
  const now = Date.now()
  const s = new Date(appt.start_time).getTime()
  const e = new Date(appt.end_time).getTime()
  if (now >= s && now < e) return 'current'
  if (e <= now) return 'past'
  return 'upcoming'
}

function getInitials(name: string) {
  const p = name.trim().split(/\s+/)
  if (p.length === 1) return p[0][0]?.toUpperCase() ?? '?'
  return ((p[0][0] ?? '') + (p[p.length - 1][0] ?? '')).toUpperCase()
}

function hourLabels(appts: TodayAppointment[]): number[] {
  if (!appts.length) return []
  let min = 23, max = 0
  for (const a of appts) {
    const h = new Date(a.start_time).getHours()
    if (h < min) min = h
    if (h > max) max = h
  }
  const start = Math.max(8, min - 1)
  const end = Math.min(20, max + 1)
  const out: number[] = []
  for (let h = start; h <= end; h++) out.push(h)
  return out
}

export function CalendarPanel({ todayAppointments, weekAppointments, basePath }: Props) {
  const router = useRouter()
  const now = React.useMemo(() => new Date(), [])

  const [selectedDate, setSelectedDate] = React.useState<Date>(now)
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [nowLabel, setNowLabel] = React.useState('')

  // Ref date moves with week navigation
  const refDate = React.useMemo(() => {
    const d = new Date(now)
    d.setDate(now.getDate() + weekOffset * 7)
    return d
  }, [now, weekOffset])

  const weekDays = React.useMemo(() => getWeekDays(refDate), [refDate])

  // Reset selected date when week changes
  React.useEffect(() => {
    if (weekOffset === 0) setSelectedDate(now)
    else setSelectedDate(weekDays[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  // Current time label
  React.useEffect(() => {
    const update = () => {
      const d = new Date()
      setNowLabel(
        `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
      )
    }
    update()
    const id = setInterval(update, 60_000)
    return () => clearInterval(id)
  }, [])

  const isSelectedToday = isSameDay(selectedDate, now)

  // Appointments for the selected day
  const displayAppts = React.useMemo(() => {
    if (isSelectedToday && weekOffset === 0) return todayAppointments
    const sel = selectedDate.toISOString().slice(0, 10)
    return weekAppointments.filter(
      (a) => new Date(a.start_time).toISOString().slice(0, 10) === sel
    )
  }, [selectedDate, isSelectedToday, weekOffset, todayAppointments, weekAppointments])

  const hours = hourLabels(displayAppts)
  const monthLabel = `${MONTHS[refDate.getMonth()]}, ${refDate.getFullYear()}`
  const dayLabel = `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`

  return (
    <div
      style={{
        background: '#F4F4F4',
        borderRadius: 20,
        padding: 16,
        paddingBottom: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* ── Month header + navigation ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <p style={{
          margin: 0,
          fontFamily: 'Outfit, sans-serif',
          fontSize: 32,
          fontWeight: 500,
          color: '#222',
          letterSpacing: '-0.8px',
          lineHeight: 1,
        }}>
          {monthLabel}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            aria-label="Settimana precedente"
            onClick={() => setWeekOffset((w) => w - 1)}
            style={navBtnStyle}
          >
            <ChevronLeft size={17} strokeWidth={2} color="#222" />
          </button>
          <button
            type="button"
            aria-label="Settimana successiva"
            onClick={() => setWeekOffset((w) => w + 1)}
            style={navBtnStyle}
          >
            <ChevronRight size={17} strokeWidth={2} color="#222" />
          </button>
        </div>
      </div>

      {/* ── Day strip ─── */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {weekDays.map((day) => {
          const sel = isSameDay(day, selectedDate)
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => setSelectedDate(day)}
              style={{
                flex: 1,
                height: 72,
                borderRadius: 10,
                background: sel ? '#222' : '#FFFFFF',
                color: sel ? '#FFFFFF' : '#222',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: 0,
              }}
            >
              <span style={{
                fontSize: 11,
                fontWeight: sel ? 400 : 500,
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
              }}>
                {SHORT_DAYS[day.getDay()]}
              </span>
              <span style={{
                fontSize: 20,
                fontWeight: sel ? 500 : 600,
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1,
              }}>
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Action bar ─── */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/calendario`)}
          style={{
            flex: 1,
            height: 38,
            background: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'Outfit, sans-serif',
            color: '#222',
          }}
        >
          Aggiungi appuntamento
        </button>
        <button
          type="button"
          aria-label="Aggiorna"
          onClick={() => router.refresh()}
          style={iconBtnStyle}
        >
          <RefreshCw size={16} strokeWidth={2} color="#222" />
        </button>
        <button
          type="button"
          aria-label="Esporta"
          style={iconBtnStyle}
        >
          <FileDown size={16} strokeWidth={2} color="#222" />
        </button>
      </div>

      {/* ── Date label ─── */}
      <p style={{
        margin: 0,
        fontSize: 22,
        fontWeight: 500,
        fontFamily: 'Outfit, sans-serif',
        color: '#222',
        letterSpacing: '-0.5px',
        flexShrink: 0,
      }}>
        {dayLabel}
      </p>

      {/* ── Column headers ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 20, fontSize: 13, fontWeight: 500, fontFamily: 'Outfit, sans-serif', color: '#222', letterSpacing: '-0.3px' }}>
          <span>Orario</span>
          <span>Appuntamenti</span>
        </div>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 10,
          padding: '6px 12px',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'Outfit, sans-serif',
          color: '#222',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          height: 34,
          boxSizing: 'border-box',
        }}>
          Tutti
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* ── Appointment list ─── */}
      <div
        className="cal-panel-scroll"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {displayAppts.length === 0 ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 100,
          }}>
            <p style={{ fontSize: 13, color: '#B0B0B0', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
              Nessun appuntamento
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>

            {/* Time column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              flexShrink: 0,
              width: 40,
              position: 'relative',
            }}>
              {hours.map((h, i) => (
                <React.Fragment key={h}>
                  <p style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: 'Outfit, sans-serif',
                    color: '#222',
                    letterSpacing: '-0.3px',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {String(h).padStart(2, '0')}:00
                  </p>
                  {i < hours.length - 1 && (
                    <div style={{
                      width: 1,
                      background: '#D0D0D0',
                      minHeight: 50,
                      flex: 1,
                      marginLeft: 'auto',
                      marginRight: 4,
                      marginTop: 4,
                      marginBottom: 4,
                    }} />
                  )}
                </React.Fragment>
              ))}

              {/* Current time overlay badge */}
              {isSelectedToday && nowLabel && (
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: '40%',
                  background: '#FFFFFF',
                  borderRadius: 5,
                  padding: '2px 4px',
                  fontSize: 10,
                  fontFamily: 'Outfit, sans-serif',
                  color: '#222',
                  whiteSpace: 'nowrap',
                  zIndex: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                  {nowLabel}
                </div>
              )}
            </div>

            {/* Cards column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              {displayAppts.map((appt) => {
                const st = apptStatus(appt, isSelectedToday)
                const isPast = st === 'past'
                const isCurrent = st === 'current'
                const services = appt.service_names.join(' + ')
                const timeRange = `${fmtTime(appt.start_time)} - ${fmtTime(appt.end_time)}`

                return (
                  <div
                    key={appt.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 10,
                      padding: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: isPast ? 0.5 : 1,
                      border: isCurrent ? '0.5px solid #222' : 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', minWidth: 0 }}>
                      {/* Avatar */}
                      <div style={{
                        width: 25, height: 25,
                        borderRadius: '50%',
                        background: '#EBEBEB',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: 'Outfit, sans-serif',
                        color: '#666',
                        flexShrink: 0,
                      }}>
                        {getInitials(appt.client_name)}
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0 }}>
                        <p style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: 'Outfit, sans-serif',
                          color: '#222',
                          lineHeight: 1.2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {appt.client_name}
                        </p>
                        <p style={{
                          margin: '2px 0 0',
                          fontSize: 9,
                          fontFamily: 'Outfit, sans-serif',
                          color: '#333',
                          lineHeight: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {timeRange}{services ? ` · ${services}` : ''}
                        </p>
                      </div>
                    </div>

                    {/* ··· menu */}
                    <button
                      type="button"
                      aria-label={`Opzioni per ${appt.client_name}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        color: '#B0B0B0',
                        flexShrink: 0,
                        fontSize: 14,
                        lineHeight: 1,
                        letterSpacing: '1px',
                      }}
                    >
                      ···
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─── */}
      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/calendario`)}
          style={{
            width: '100%',
            height: 38,
            background: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            fontFamily: 'Outfit, sans-serif',
            color: '#222',
          }}
        >
          Visualizza dettaglio
        </button>
      </div>
    </div>
  )
}

const navBtnStyle: React.CSSProperties = {
  width: 36, height: 36,
  borderRadius: '50%',
  background: '#FFFFFF',
  border: 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const iconBtnStyle: React.CSSProperties = {
  width: 38, height: 38,
  borderRadius: '50%',
  background: '#FFFFFF',
  border: 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
}
