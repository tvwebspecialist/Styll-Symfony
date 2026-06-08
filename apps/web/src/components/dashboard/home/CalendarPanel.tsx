'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment, WorkingHour } from '@/lib/actions/dashboard-home'
import { CustomSelect } from '@/components/ui/custom-select'

interface Props {
  todayAppointments: TodayAppointment[]
  weekAppointments: TodayAppointment[]
  workingHours: WorkingHour[]
  basePath: string
}

const MONTHS = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const SHORT_DAYS = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

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

function getInitials(name: string) {
  const p = name.trim().split(/\s+/)
  if (p.length === 1) return p[0][0]?.toUpperCase() ?? '?'
  return ((p[0][0] ?? '') + (p[p.length - 1][0] ?? '')).toUpperCase()
}

function parseTimeStr(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function apptMinutes(iso: string): number {
  const d = new Date(iso)
  return d.getHours() * 60 + d.getMinutes()
}

type TimelineSlot = {
  ora: string
  tipo: 'appuntamento' | 'libero'
  nomeCliente?: string
  iniziali?: string
  servizio?: string
  appointmentId?: string
}

type FiltroStato = 'tutti' | 'confirmed' | 'pending' | 'completed'

export function CalendarPanel({ todayAppointments, weekAppointments, workingHours, basePath }: Props) {
  const router = useRouter()
  const now = React.useMemo(() => new Date(), [])

  const [selectedDate, setSelectedDate] = React.useState<Date>(now)
  const [weekOffset, setWeekOffset] = React.useState(0)
  const [filtroStato, setFiltroStato] = React.useState<FiltroStato>('tutti')

  // Current time in minutes — updated every minute for the "now" line
  const [nowMinutes, setNowMinutes] = React.useState<number>(
    () => now.getHours() * 60 + now.getMinutes()
  )
  React.useEffect(() => {
    const id = setInterval(() => {
      const d = new Date()
      setNowMinutes(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  const refDate = React.useMemo(() => {
    const d = new Date(now)
    d.setDate(now.getDate() + weekOffset * 7)
    return d
  }, [now, weekOffset])

  const weekDays = React.useMemo(() => getWeekDays(refDate), [refDate])

  React.useEffect(() => {
    if (weekOffset === 0) setSelectedDate(now)
    else setSelectedDate(weekDays[0])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset])

  const isSelectedToday = isSameDay(selectedDate, now)

  const displayAppts = React.useMemo(() => {
    if (isSelectedToday && weekOffset === 0) return todayAppointments
    const sel = selectedDate.toISOString().slice(0, 10)
    return weekAppointments.filter(
      (a) => new Date(a.start_time).toISOString().slice(0, 10) === sel
    )
  }, [selectedDate, isSelectedToday, weekOffset, todayAppointments, weekAppointments])

  const monthLabel = `${MONTHS[refDate.getMonth()]}, ${refDate.getFullYear()}`
  const dayLabel = `${selectedDate.getDate()} ${MONTHS[selectedDate.getMonth()]}`
  const selectedDateStr = selectedDate.toISOString().slice(0, 10)

  // Working hours for the selected day of week
  const dayWorkingHours = React.useMemo(
    () => workingHours.filter(wh => wh.day_of_week === selectedDate.getDay()),
    [selectedDate, workingHours],
  )

  // Build 30-min timeline slots, filtered by status
  const slots = React.useMemo((): TimelineSlot[] => {
    if (dayWorkingHours.length === 0) return []
    const workStart = Math.min(...dayWorkingHours.map(wh => parseTimeStr(wh.start_time)))
    const workEnd = Math.max(...dayWorkingHours.map(wh => parseTimeStr(wh.end_time)))

    const appts = filtroStato === 'tutti'
      ? displayAppts
      : displayAppts.filter(a => a.status === filtroStato)

    const result: TimelineSlot[] = []
    const shownAppts = new Set<string>()

    for (let m = workStart; m < workEnd; m += 30) {
      const h = Math.floor(m / 60)
      const min = m % 60
      const oraLabel = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`

      const appt = appts.find(a => {
        const start = apptMinutes(a.start_time)
        const end = apptMinutes(a.end_time)
        return start <= m && end > m
      })

      if (appt) {
        if (!shownAppts.has(appt.id)) {
          shownAppts.add(appt.id)
          result.push({
            ora: oraLabel,
            tipo: 'appuntamento',
            nomeCliente: appt.client_name,
            iniziali: getInitials(appt.client_name),
            servizio: appt.service_names[0] ?? '',
            appointmentId: appt.id,
          })
        }
      } else {
        result.push({ ora: oraLabel, tipo: 'libero' })
      }
    }
    return result
  }, [dayWorkingHours, displayAppts, filtroStato])

  return (
    <div
      style={{
        background: 'var(--card-bg, #FFFFFF)',
        borderRadius: 'var(--card-radius, 16px)',
        border: '1px solid var(--card-border, #E9E9E9)',
        boxShadow: 'var(--card-shadow)',
        padding: 20,
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
                background: sel ? '#222' : '#F4F4F4',
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
              <span style={{ fontSize: 11, fontWeight: sel ? 400 : 500, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {SHORT_DAYS[day.getDay()]}
              </span>
              <span style={{ fontSize: 20, fontWeight: sel ? 500 : 600, fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {day.getDate()}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Date + Add button ─── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{
          fontSize: 18,
          fontWeight: 700,
          color: 'var(--text-primary, #111827)',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.3px',
        }}>
          {dayLabel}
        </div>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/calendario?new=1&data=${selectedDateStr}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '6px 14px',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: 600,
            background: 'var(--sidebar-item-active-bg, #222222)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            fontFamily: 'Outfit, sans-serif',
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Aggiungi
        </button>
      </div>

      {/* ── Table header: Orario | Appuntamenti + filter ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 8,
        borderBottom: '1px solid var(--divider, #F0F0F0)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary, #9CA3AF)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Outfit, sans-serif',
          }}>
            Orario
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-secondary, #9CA3AF)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontFamily: 'Outfit, sans-serif',
          }}>
            Appuntamenti
          </span>
        </div>
        <CustomSelect
          compact
          align="end"
          value={filtroStato}
          onChange={(v) => setFiltroStato(v as FiltroStato)}
          options={[
            { value: 'tutti', label: 'Tutti' },
            { value: 'confirmed', label: 'Confermati' },
            { value: 'pending', label: 'In attesa' },
            { value: 'completed', label: 'Completati' },
          ]}
        />
      </div>

      {/* ── Timeline ─── */}
      <div
        className="mini-cal-timeline"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        {dayWorkingHours.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 100 }}>
            <p style={{ fontSize: 13, color: '#B0B0B0', fontFamily: 'Outfit, sans-serif', margin: 0 }}>
              Giorno libero
            </p>
          </div>
        ) : (
          slots.map((slot) => {
            const slotMin = parseTimeStr(slot.ora)
            const showNowLine = isSelectedToday &&
              nowMinutes >= slotMin && nowMinutes < slotMin + 30

            return (
              <React.Fragment key={slot.ora}>
                {showNowLine && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    margin: '0 4px 2px 4px',
                    pointerEvents: 'none',
                  }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#EF4444',
                      flexShrink: 0,
                      marginLeft: 32,
                      boxShadow: '0 0 6px rgba(239,68,68,0.6)',
                    }} />
                    <div style={{
                      flex: 1,
                      height: 1.5,
                      background: '#EF4444',
                      opacity: 0.8,
                      borderRadius: 1,
                    }} />
                  </div>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    minHeight: 36,
                    paddingLeft: 4,
                    paddingRight: 4,
                  }}
                >
                  {/* Time column */}
                  <div style={{
                    width: 40,
                    fontSize: 11,
                    color: 'var(--text-secondary, #9CA3AF)',
                    fontWeight: 500,
                    fontFamily: 'Outfit, sans-serif',
                    flexShrink: 0,
                    paddingTop: 10,
                    lineHeight: 1,
                    opacity: 0.6,
                  }}>
                    {slot.ora}
                  </div>

                  {/* Slot content */}
                  {slot.tipo === 'appuntamento' ? (
                    <div style={{
                      flex: 1,
                      background: 'var(--sidebar-item-active-bg, #222222)',
                      borderRadius: 10,
                      padding: '8px 10px',
                      marginBottom: 4,
                      cursor: 'pointer',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: 'rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#FFFFFF',
                          flexShrink: 0,
                          fontFamily: 'Outfit, sans-serif',
                        }}>
                          {slot.iniziali}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#FFFFFF',
                            fontFamily: 'Outfit, sans-serif',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                          }}>
                            {slot.nomeCliente}
                          </div>
                          <div style={{
                            fontSize: 10,
                            color: 'rgba(255,255,255,0.55)',
                            fontFamily: 'Outfit, sans-serif',
                            marginTop: 1,
                            lineHeight: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {slot.ora}{slot.servizio ? ` · ${slot.servizio}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      flex: 1,
                      height: 1,
                      marginTop: 18,
                      background: 'var(--divider, #F0F0F0)',
                      opacity: 0.5,
                    }} />
                  )}
                </div>
              </React.Fragment>
            )
          })
        )}
      </div>

      {/* ── Footer ─── */}
      <div style={{ flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/calendario?data=${selectedDateStr}`)}
          style={{
            width: '100%',
            height: 38,
            background: '#F4F4F4',
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
  background: '#F4F4F4',
  border: 'none',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}
