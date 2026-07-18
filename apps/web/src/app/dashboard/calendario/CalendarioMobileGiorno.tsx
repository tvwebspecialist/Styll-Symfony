'use client'

import * as React from 'react'
import { Users } from 'lucide-react'
import { getLocalMinutes, formatTimeInTimezone } from '@/lib/utils/timezone'
import { DAYS_ABBR, MONTHS_IT } from '@/components/dashboard/calendario/calendario-utils'
import type { CalendarioAppointment } from '@/lib/actions/calendario'

const ALTEZZA_ORA = 80
const STRIP_DAYS_BEFORE = 14
const STRIP_DAYS_AFTER = 15

interface Props {
  data: string
  allAppts: CalendarioAppointment[]
  orarioInizio: number
  orarioFine: number
  timezone: string
  onCambiaData: (date: string) => void
  onNuovoAppuntamento: () => void
  onClickAppuntamento: (apt: CalendarioAppointment) => void
  staffFilterLabel?: string | null
  onOpenStaffPicker?: () => void
}

function addDaysLocal(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function getColorePerStato(status: string): { bg: string; text: string; textMuted: string } {
  switch (status) {
    case 'confirmed':
      return { bg: '#DBEAFE', text: '#1E40AF', textMuted: '#3B82F6' }
    case 'completed':
      return { bg: '#DCFCE7', text: '#166534', textMuted: '#22C55E' }
    case 'pending':
      return { bg: '#FEF9C3', text: '#713F12', textMuted: '#EAB308' }
    case 'cancelled':
    case 'no_show':
      return { bg: '#FEE2E2', text: '#991B1B', textMuted: '#EF4444' }
    default:
      return { bg: '#F3F4F6', text: '#374151', textMuted: '#9CA3AF' }
  }
}

function LineaNow({ orarioInizio, altezzaOra }: { orarioInizio: number; altezzaOra: number }) {
  const [ora, setOra] = React.useState(() => new Date())

  React.useEffect(() => {
    const t = setInterval(() => setOra(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  const minutiDaInizio = (ora.getHours() - orarioInizio) * 60 + ora.getMinutes()
  if (minutiDaInizio < 0) return null

  const top = 8 + (minutiDaInizio / 60) * altezzaOra

  return (
    <div style={{
      position: 'absolute',
      top,
      left: 0,
      right: 0,
      display: 'flex',
      alignItems: 'center',
      zIndex: 10,
      pointerEvents: 'none',
    }}>
      <div style={{
        minWidth: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
        gap: 4,
        paddingRight: 6,
      }}>
        <span style={{
          fontSize: 9, fontWeight: 800,
          color: '#EF4444', letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}>
          ORA
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: '#EF4444',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}>
          {String(ora.getHours()).padStart(2, '0')}:{String(ora.getMinutes()).padStart(2, '0')}
        </span>
      </div>
      <div style={{
        width: 9, height: 9,
        borderRadius: '50%',
        background: '#EF4444',
        flexShrink: 0,
        boxShadow: '0 0 6px rgba(239,68,68,0.6)',
      }} />
      <div style={{
        flex: 1,
        height: 1.5,
        background: '#EF4444',
        marginRight: 16,
        opacity: 0.85,
      }} />
    </div>
  )
}

export function CalendarioMobileGiorno({
  data,
  allAppts,
  orarioInizio,
  orarioFine,
  timezone,
  onCambiaData,
  onNuovoAppuntamento,
  onClickAppuntamento,
  staffFilterLabel,
  onOpenStaffPicker,
}: Props) {
  const timelineRef = React.useRef<HTMLDivElement>(null)
  const stripRef = React.useRef<HTMLDivElement>(null)
  const pillRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map())

  const todayStr = React.useMemo(() => getTodayStr(), [])
  const isOggi = data === todayStr
  const numOre = orarioFine - orarioInizio

  // 30-day strip centered on today
  const stripDays = React.useMemo(() => {
    return Array.from({ length: STRIP_DAYS_BEFORE + 1 + STRIP_DAYS_AFTER }, (_, i) =>
      addDaysLocal(todayStr, i - STRIP_DAYS_BEFORE)
    )
  }, [todayStr])

  const appuntamentiPerGiorno = React.useMemo(() => {
    const map: Record<string, number> = {}
    allAppts.forEach((a) => {
      const key = a.start_time.slice(0, 10)
      map[key] = (map[key] ?? 0) + 1
    })
    return map
  }, [allAppts])

  const appuntamentiGiorno = React.useMemo(
    () => allAppts.filter((a) => a.start_time.slice(0, 10) === data),
    [allAppts, data]
  )

  // Large date label
  const dataObj = new Date(data + 'T12:00:00')
  const dayName = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'][dataObj.getDay()] ?? ''
  const dayNum = dataObj.getDate()
  const monthName = MONTHS_IT[dataObj.getMonth()] ?? ''

  // Drag scroll on strip
  const dragState = React.useRef<{ active: boolean; startX: number; scrollLeft: number }>({
    active: false, startX: 0, scrollLeft: 0,
  })

  function onStripMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const el = stripRef.current
    if (!el) return
    dragState.current = { active: true, startX: e.pageX - el.offsetLeft, scrollLeft: el.scrollLeft }
    el.style.cursor = 'grabbing'
  }
  function onStripMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current.active || !stripRef.current) return
    e.preventDefault()
    const x = e.pageX - stripRef.current.offsetLeft
    stripRef.current.scrollLeft = dragState.current.scrollLeft - (x - dragState.current.startX)
  }
  function onStripMouseUp() {
    dragState.current.active = false
    if (stripRef.current) stripRef.current.style.cursor = ''
  }

  // Scroll selected day into view
  React.useEffect(() => {
    const el = pillRefs.current.get(data)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [data])

  // Auto-scroll timeline to now
  React.useEffect(() => {
    if (!timelineRef.current) return
    const now = new Date()
    const minutiDaInizio = (now.getHours() - orarioInizio) * 60 + now.getMinutes()
    const scrollTop = Math.max(0, (minutiDaInizio / 60) * ALTEZZA_ORA + 8 - 80)
    timelineRef.current.scrollTop = scrollTop
  }, [data, orarioInizio])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#FFFFFF',
    }}>

      {/* ── Header ── */}
      <div style={{
        flexShrink: 0,
        padding: '16px 16px 0',
        background: '#FFFFFF',
      }}>

        {/* Row 1: large date + staff picker */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>
              {dayName}
            </div>
            <div style={{ fontSize: 17, fontWeight: 500, color: '#6B7280', marginTop: 2 }}>
              {dayNum} {monthName}
            </div>
          </div>
          {onOpenStaffPicker && (
            <button
              type="button"
              onClick={onOpenStaffPicker}
              aria-label="Filtra staff"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 10px', borderRadius: 10,
                fontSize: 12, fontWeight: 600,
                background: staffFilterLabel ? '#222222' : 'rgba(0,0,0,0.06)',
                color: staffFilterLabel ? '#FFFFFF' : '#6B7280',
                border: 'none', cursor: 'pointer',
                marginTop: 4,
              }}
            >
              <Users size={13} />
              {staffFilterLabel ? (staffFilterLabel.split(' ')[0] ?? staffFilterLabel) : 'Tutti'}
            </button>
          )}
        </div>

        {/* Row 2: 30-day strip */}
        <div
          ref={stripRef}
          onMouseDown={onStripMouseDown}
          onMouseMove={onStripMouseMove}
          onMouseUp={onStripMouseUp}
          onMouseLeave={onStripMouseUp}
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            overflowY: 'visible',
            scrollbarWidth: 'none',
            paddingTop: 8,
            paddingBottom: 20,
            paddingLeft: 16,
            paddingRight: 24,
            marginLeft: -16,
            marginRight: -16,
            scrollSnapType: 'x mandatory',
            userSelect: 'none',
            cursor: 'grab',
          }}
        >
          {stripDays.map((giorno) => {
            const isOggiGiorno = giorno === todayStr
            const isSelezionato = giorno === data
            const haAppts = (appuntamentiPerGiorno[giorno] ?? 0) > 0
            const d = new Date(giorno + 'T12:00:00')

            return (
              <button
                key={giorno}
                ref={(el) => {
                  if (el) pillRefs.current.set(giorno, el)
                  else pillRefs.current.delete(giorno)
                }}
                type="button"
                onClick={() => onCambiaData(giorno)}
                style={{
                  flexShrink: 0,
                  width: 52,
                  height: 72,
                  borderRadius: 18,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 4,
                  border: 'none', cursor: 'pointer',
                  scrollSnapAlign: 'start',
                  transition: 'transform 120ms ease, box-shadow 120ms ease',
                  transform: isSelezionato ? 'scale(1.10)' : 'scale(1)',
                  background: isSelezionato ? '#222222' : '#FFFFFF',
                  boxShadow: isSelezionato
                    ? '0 4px 16px rgba(0,0,0,0.22)'
                    : '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: isSelezionato ? '#FFFFFF' : isOggiGiorno ? '#111827' : '#9CA3AF',
                }}>
                  {DAYS_ABBR[d.getDay()] ?? ''}
                </span>
                <span style={{
                  fontSize: 22, fontWeight: 700, lineHeight: 1,
                  color: isSelezionato ? '#FFFFFF' : isOggiGiorno ? '#111827' : '#6B7280',
                }}>
                  {d.getDate()}
                </span>
                {haAppts && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: isSelezionato ? 'rgba(255,255,255,0.6)' : '#22C55E',
                  }} />
                )}
                {!haAppts && <div style={{ width: 6, height: 6 }} />}
              </button>
            )
          })}
        </div>

        {/* Divisore */}
        <div style={{ height: 1, background: '#F0F0F0' }} />
      </div>

      {/* ── Timeline ── */}
      <div
        ref={timelineRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
        }}
      >
        <div style={{ position: 'relative', height: numOre * ALTEZZA_ORA + 16 }}>

          {/* Righe orarie */}
          {Array.from({ length: numOre }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: 8 + i * ALTEZZA_ORA,
                left: 0, right: 0,
                height: ALTEZZA_ORA,
                display: 'flex',
                alignItems: 'flex-start',
              }}
            >
              <div style={{
                width: 52, flexShrink: 0,
                paddingRight: 8,
                textAlign: 'right',
                fontSize: 11,
                fontWeight: 500,
                color: '#9CA3AF',
                opacity: 0.7,
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
              }}>
                {String(orarioInizio + i).padStart(2, '0')}:00
              </div>
              <div style={{
                flex: 1,
                borderTop: '1px solid #F0F0F0',
                height: '100%',
                marginRight: 16,
              }} />
            </div>
          ))}

          {/* Card appuntamenti */}
          {appuntamentiGiorno.map((apt) => {
            const startMin = getLocalMinutes(apt.start_time, timezone)
            const endMin   = getLocalMinutes(apt.end_time, timezone)
            const minutiDaInizio = startMin - orarioInizio * 60
            const durataMinuti = endMin - startMin
            const top    = 8 + (minutiDaInizio / 60) * ALTEZZA_ORA
            const height = Math.max((durataMinuti / 60) * ALTEZZA_ORA, 44)
            const colore = getColorePerStato(apt.status)
            const servizi = apt.services.map((s) => s.name).join(', ')

            return (
              <div
                key={apt.id}
                role="button"
                tabIndex={0}
                onClick={() => onClickAppuntamento(apt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onClickAppuntamento(apt)
                }}
                style={{
                  position: 'absolute',
                  top,
                  left: 60,
                  right: 16,
                  height: Math.max(height, 50),
                  borderRadius: 12,
                  background: colore.bg,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  zIndex: 2,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: colore.text, lineHeight: 1.2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {apt.client_name}
                </div>
                {height > 44 && (
                  <div style={{ fontSize: 12, color: colore.textMuted, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formatTimeInTimezone(apt.start_time, timezone)}
                    {servizi ? ` · ${servizi}` : ''}
                  </div>
                )}
              </div>
            )
          })}

          {/* Linea NOW — solo oggi */}
          {isOggi && (
            <LineaNow orarioInizio={orarioInizio} altezzaOra={ALTEZZA_ORA} />
          )}

        </div>
      </div>

      {/* FAB — nuovo appuntamento */}
      <button
        type="button"
        onClick={onNuovoAppuntamento}
        aria-label="Aggiungi appuntamento"
        style={{
          position: 'fixed',
          bottom: 'calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 16px)',
          right: 20,
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#222222',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.28)',
          zIndex: 40,
          cursor: 'pointer',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      </button>
    </div>
  )
}
