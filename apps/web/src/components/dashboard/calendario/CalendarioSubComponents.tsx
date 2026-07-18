'use client'

import * as React from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Plus, Users } from 'lucide-react'
import type { CalendarioAppointment, CalendarioData } from '@/lib/actions/calendario'
import { ApptDetailModal } from './ApptDetailModal'
import { NewApptModal } from './NewApptModal'
import { CalendarioMobileGiorno } from '@/app/dashboard/calendario/CalendarioMobileGiorno'
import {
  HOUR_HEIGHT,
  HOUR_START,
  HOUR_END,
  HOURS,
  TIME_COL_W,
  DAYS_FULL,
  MONTHS_IT,
  DAYS_ABBR,
  type CalendarView,
  formatHour,
  isToday,
  getMonthYearLabel,
  calcTimePos,
  currentTimeStr,
} from './calendario-utils'

export function CurrentTimeIndicator() {
  const [pos, setPos]   = React.useState(calcTimePos)
  const [label, setLabel] = React.useState(currentTimeStr)

  React.useEffect(() => {
    const id = setInterval(() => {
      setPos(calcTimePos())
      setLabel(currentTimeStr())
    }, 60_000)
    return () => clearInterval(id)
  }, [])

  if (pos < 0 || pos > (HOUR_END - HOUR_START) * HOUR_HEIGHT) return null

  return (
    <div
      style={{
        position: 'absolute', top: pos, left: 0, right: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', pointerEvents: 'none',
      }}
    >
      <div style={{ width: TIME_COL_W, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{
          background: '#111827', color: '#FFF', fontSize: 10, fontWeight: 600,
          borderRadius: 4, padding: '1px 4px',
        }}>
          {label}
        </span>
      </div>
      <div style={{ width: 8, height: 8, borderRadius: 100, background: '#ef4444', flexShrink: 0, marginLeft: -4 }} />
      <div style={{ flex: 1, height: 1, background: '#ef4444' }} />
    </div>
  )
}

// ── Gauge SVG ──────────────────────────────────────────────────────────────

export function GaugeSVG({ value, total }: { value: number; total: number }) {
  const r = 52, cx = 64, cy = 60
  const circum = Math.PI * r
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
  return (
    <svg viewBox={`0 0 ${cx * 2} ${cy + 10}`} width={cx * 2} height={cy + 10} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="#E5E7EB" strokeWidth="10" strokeLinecap="round" />
      {pct > 0 && (
        <path d={d} fill="none" stroke="#111827" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={`${pct * circum} ${circum}`} />
      )}
    </svg>
  )
}

// ── Mini calendar ──────────────────────────────────────────────────────────

export function MiniCalendarCard({
  weekStart,
  activeDay,
  onNavigate,
}: {
  weekStart: string
  activeDay?: string
  onNavigate: (date: string) => void
}) {
  const init = () => {
    const d = new Date(weekStart + 'T12:00:00')
    return { y: d.getFullYear(), m: d.getMonth() }
  }
  const [view, setView] = React.useState(init)

  React.useEffect(() => {
    const d = new Date(weekStart + 'T12:00:00')
    setView({ y: d.getFullYear(), m: d.getMonth() })
  }, [weekStart])

  const shift = (dir: -1 | 1) =>
    setView((v) => {
      const d = new Date(v.y, v.m + dir)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const firstDow    = new Date(view.y, view.m, 1).getDay()
  const offset      = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today       = new Date()
  const todayNum    = today.getDate()
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth()

  function handleDayClick(day: number) {
    const dateStr = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    onNavigate(dateStr)
  }

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
          {MONTHS_IT[view.m]} {view.y}
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {([-1, 1] as const).map((dir) => (
            <button key={dir} type="button" onClick={() => shift(dir)}
              style={{ width: 22, height: 22, borderRadius: 6, border: 'none', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#9CA3AF' }}>
              {dir === -1 ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: 3 }}>
        {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((l, i) => (
          <div key={i} style={{ fontSize: 9, color: '#9CA3AF', fontWeight: 600, padding: '2px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center' }}>
        {cells.map((day, i) => {
          const cellDate = day !== null
            ? `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            : null
          const isSelected = cellDate !== null && cellDate === activeDay
          const isToday = day !== null && isThisMonth && day === todayNum
          const isPast = cellDate !== null && !isThisMonth
          return (
            <div
              key={i}
              onClick={() => day !== null && handleDayClick(day)}
              style={{
                width: 24, height: 24, borderRadius: 100, margin: '1px auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: isSelected || isToday ? 700 : 400,
                background: isSelected ? '#111827' : isToday && !isSelected ? '#F3F4F6' : 'transparent',
                color: day === null ? 'transparent'
                  : isSelected ? '#FFF'
                  : isToday ? '#111827'
                  : isPast ? '#D1D5DB'
                  : '#374151',
                cursor: day !== null ? 'pointer' : 'default',
              }}
            >
              {day ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface CalendarioMainLayoutProps {
  tenantId: string
  weekStart: string
  activeDayStr: string
  todayStr: string
  dayDates: string[]
  data: CalendarioData
  currentStaffId: string | null
  isManagerOrOwner: boolean
  selectedStaffId: string | null
  timezone: string
  isMobile: boolean
  view: CalendarView
  effectiveView: CalendarView
  isTransitioning: boolean
  staffPickerOpen: boolean
  setStaffPickerOpen: React.Dispatch<React.SetStateAction<boolean>>
  detailAppt: CalendarioAppointment | null
  setDetailAppt: React.Dispatch<React.SetStateAction<CalendarioAppointment | null>>
  newApptCell: { date: string; hour: number } | null
  setNewApptCell: React.Dispatch<React.SetStateAction<{ date: string; hour: number } | null>>
  showInitialRealtimeSpinner: boolean
  visibleRealtimeError: Error | null
  staffColorMap: Record<string, string>
  completedToday: number
  todayAppts: CalendarioAppointment[]
  allAppts: CalendarioAppointment[]
  remainingToday: number
  todayRevenue: number
  avgTicket: number
  nextEmptySlot: { start: string; end: string } | null
  dayComparison: { diff: number; dayLabel: string | undefined } | null
  navigate: (dir: -1 | 1) => void
  navigateToDate: (dateStr: string) => void
  handleViewChange: (v: CalendarView) => void
  selectStaff: (id: string | null) => void
  renderDayColumn: (date: string, dayIdx: number, isFullWidth: boolean) => React.ReactNode
  router: { push: (href: string) => void; refresh: () => void }
}

export function CalendarioMainLayout({
  tenantId,
  weekStart,
  activeDayStr,
  todayStr,
  dayDates,
  data,
  currentStaffId,
  isManagerOrOwner,
  selectedStaffId,
  timezone,
  isMobile,
  view,
  effectiveView,
  isTransitioning,
  staffPickerOpen,
  setStaffPickerOpen,
  detailAppt,
  setDetailAppt,
  newApptCell,
  setNewApptCell,
  showInitialRealtimeSpinner,
  visibleRealtimeError,
  staffColorMap,
  completedToday,
  todayAppts,
  allAppts,
  remainingToday,
  todayRevenue,
  avgTicket,
  nextEmptySlot,
  dayComparison,
  navigate,
  navigateToDate,
  handleViewChange,
  selectStaff,
  renderDayColumn,
  router,
}: CalendarioMainLayoutProps) {
  return (
    <div style={{ position: 'relative', display: 'flex', gap: 16, height: isMobile ? 'calc(100vh - 76px - var(--bottom-nav-height, 64px) - env(safe-area-inset-bottom, 0px) - 8px)' : 'calc(100vh - 168px)', overflow: 'hidden' }}>

      {/* ── LEFT: calendar ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Mobile: vista giorno verticale */}
        {isMobile && (
          <CalendarioMobileGiorno
            data={activeDayStr}
            allAppts={allAppts}
            orarioInizio={HOUR_START}
            orarioFine={HOUR_END}
            timezone={timezone}
            onCambiaData={(date) => {
              const p = new URLSearchParams({ day: date })
              if (selectedStaffId) p.set('staff', selectedStaffId)
              router.push(`/calendario?${p}`)
            }}
            onNuovoAppuntamento={() => setNewApptCell({ date: activeDayStr, hour: 9 })}
            onClickAppuntamento={(apt) => setDetailAppt(apt)}
            staffFilterLabel={selectedStaffId ? (data.staff.find((s) => s.id === selectedStaffId)?.full_name ?? null) : null}
            onOpenStaffPicker={isManagerOrOwner && data.staff.length > 1 ? () => setStaffPickerOpen(true) : undefined}
          />
        )}

        {/* Header — desktop only */}
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 16, flexShrink: 0 }}>

            {/* LEFT: Month/Year */}
            <h1 style={{
              margin: 0,
              color: '#222222',
              fontFamily: 'Outfit, sans-serif',
              fontSize: 36,
              fontWeight: 500,
              lineHeight: 'normal',
              letterSpacing: '-0.9px',
            }}>
              {getMonthYearLabel(weekStart)}
            </h1>

            {/* CENTER: View toggle */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {(['Giorno', 'Settimana', 'Mese'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleViewChange(v)}
                  style={{
                    display: 'flex',
                    padding: '0 20px',
                    height: 36,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderRadius: 999,
                    background: view === v ? '#222222' : '#FFFFFF',
                    color: view === v ? '#FFFFFF' : '#222222',
                    fontFamily: 'Outfit, sans-serif',
                    fontSize: 14,
                    fontWeight: 500,
                    lineHeight: 'normal',
                    border: view === v ? '1px solid #222222' : '1px solid #E9E9E9',
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    transition: 'background 120ms ease, color 120ms ease, border-color 120ms ease',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* RIGHT: Navigator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Precedente"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 36,
                  height: 36,
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#222222',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
              >
                ‹
              </button>
              <div style={{
                display: 'flex',
                padding: '10px 24px',
                justifyContent: 'center',
                alignItems: 'center',
                background: '#F5F5F5',
                borderRadius: 10,
                fontFamily: 'Outfit, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                color: '#222222',
                minWidth: 120,
                textAlign: 'center',
                whiteSpace: 'nowrap',
                opacity: isTransitioning ? 0 : 1,
                transform: isTransitioning ? 'translateX(-8px)' : 'translateX(0)',
                transition: 'opacity 300ms ease, transform 300ms ease',
              }}>
                {view}
              </div>
              <button
                type="button"
                onClick={() => navigate(1)}
                aria-label="Successiva"
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: 36,
                  height: 36,
                  border: '1px solid #E5E7EB',
                  borderRadius: 8,
                  background: '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: 18,
                  color: '#222222',
                  boxSizing: 'border-box',
                  flexShrink: 0,
                  transition: 'background 200ms ease',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F5F5F5' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#FFFFFF' }}
              >
                ›
              </button>
            </div>

          </div>
        )}

        {/* Staff filter pills — desktop */}
        {isManagerOrOwner && data.staff.length > 1 && !isMobile && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
            <button type="button" onClick={() => selectStaff(null)} style={{
              padding: '4px 12px', borderRadius: 100,
              border: `1.5px solid ${!selectedStaffId ? '#111827' : '#E5E7EB'}`,
              background: !selectedStaffId ? '#111827' : '#FFF',
              color: !selectedStaffId ? '#FFF' : '#6B7280',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>Tutti</button>
            {data.staff.map((s) => {
              const active = selectedStaffId === s.id
              const col    = staffColorMap[s.id] ?? '#374151'
              return (
                <button key={s.id} type="button" onClick={() => selectStaff(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px',
                  borderRadius: 100, border: `1.5px solid ${active ? col : '#E5E7EB'}`,
                  background: active ? col + '18' : '#FFF', color: active ? col : '#6B7280',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer',
                }}>
                  <div style={{ width: 14, height: 14, borderRadius: 100, background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: '#FFF', flexShrink: 0 }}>
                    {s.full_name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  {s.full_name ?? 'Staff'}
                </button>
              )
            })}
          </div>
        )}

        {/* FIX 2: Staff picker bottom sheet — mobile (replaces the avatar strip) */}
        {isMobile && isManagerOrOwner && data.staff.length > 1 && staffPickerOpen && (
          <>
            {/* Backdrop */}
            <div
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000 }}
              onClick={() => setStaffPickerOpen(false)}
            />
            {/* Sheet */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              background: '#FFF', borderRadius: '20px 20px 0 0',
              padding: '16px 20px 40px', zIndex: 1001,
              boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }} />
              </div>
              <p style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700, color: '#111827' }}>Filtra per staff</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => { selectStaff(null); setStaffPickerOpen(false) }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12,
                    border: !selectedStaffId ? '1.5px solid #111827' : '1px solid #E5E7EB',
                    background: !selectedStaffId ? '#111827' : '#FFF',
                    color: !selectedStaffId ? '#FFF' : '#374151',
                    fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: !selectedStaffId ? 'rgba(255,255,255,0.15)' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Users size={14} color={!selectedStaffId ? '#fff' : '#6B7280'} />
                  </div>
                  Tutti
                </button>
                {data.staff.map((s) => {
                  const active = selectedStaffId === s.id
                  const col    = staffColorMap[s.id] ?? '#374151'
                  const initials = (s.full_name ?? '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => { selectStaff(s.id); setStaffPickerOpen(false) }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '12px 14px', borderRadius: 12,
                        border: active ? `1.5px solid ${col}` : '1px solid #E5E7EB',
                        background: active ? col + '12' : '#FFF',
                        color: '#374151', fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#FFF', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
                        {s.avatar_url
                          ? <Image src={s.avatar_url} alt="" fill style={{ objectFit: 'cover' }} />
                          : initials}
                      </div>
                      {s.full_name ?? 'Staff'}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* Calendar card — desktop only */}
        {!isMobile && (<div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', overflow: 'hidden' }}>

          {showInitialRealtimeSpinner ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                aria-label="Caricamento appuntamenti"
                className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"
              />
            </div>
          ) : effectiveView === 'Mese' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 36 }}>🗓️</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Prossimamente</span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>La vista mese sarà disponibile presto.</span>
            </div>
          ) : effectiveView === 'Giorno' ? (
            <>
              {/* Day header — single column (desktop only) */}
              {!isMobile && (
              <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
                <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Ora</span>
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', padding: isToday(activeDayStr) ? 0 : '6px 4px' }}>
                  {isToday(activeDayStr) ? (
                    <div style={{ flex: 1, background: '#111827', borderRadius: 10, padding: '25px 19px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15, margin: '4px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>
                        {(() => { const d = new Date(activeDayStr + 'T12:00:00'); return DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? '' })()}
                      </span>
                      <span style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                        {new Date(activeDayStr + 'T12:00:00').getDate()}
                      </span>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
                      <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>
                        {(() => { const d = new Date(activeDayStr + 'T12:00:00'); return DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? '' })()}
                      </span>
                      <span style={{ fontSize: 26, fontWeight: 700, color: '#222222', lineHeight: 1 }}>
                        {new Date(activeDayStr + 'T12:00:00').getDate()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              )}
              {/* Scrollable single-day grid */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', position: 'relative' }}>
                  <CurrentTimeIndicator />
                  <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid #F0F0F0' }}>
                    {HOURS.map((h) => (
                      <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5, borderBottom: '1px solid #F9FAFB' }}>
                        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{formatHour(h)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {renderDayColumn(activeDayStr, 0, true)}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Day headers — week view */}
              <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
                <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500 }}>Ora</span>
                </div>
                {dayDates.map((date, i) => {
                  const tod = isToday(date)
                  return (
                    <div key={date} style={{ flex: 1, borderRight: i < 5 ? '1px solid #F0F0F0' : 'none', display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', padding: tod ? 0 : '6px 4px' }}>
                      {tod ? (
                        <div style={{ flex: 1, background: '#111827', borderRadius: 10, padding: '25px 19px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 15, margin: '4px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF' }}>{DAYS_FULL[i]}</span>
                          <span style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', lineHeight: 1 }}>
                            {new Date(date + 'T12:00:00').getDate()}
                          </span>
                        </div>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 15 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF' }}>{DAYS_FULL[i]}</span>
                          <span style={{ fontSize: 26, fontWeight: 700, color: '#222222', lineHeight: 1 }}>
                            {new Date(date + 'T12:00:00').getDate()}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Scrollable week grid */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', position: 'relative' }}>
                  <CurrentTimeIndicator />
                  <div style={{ width: TIME_COL_W, flexShrink: 0, borderRight: '1px solid #F0F0F0' }}>
                    {HOURS.map((h) => (
                      <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5, borderBottom: '1px solid #F9FAFB' }}>
                        <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{formatHour(h)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1, display: 'flex' }}>
                    {dayDates.map((date, dayIdx) => renderDayColumn(date, dayIdx, false))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>)}
      </div>

      {/* ── RIGHT SIDEBAR (desktop only) ── */}
      {!isMobile && <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', height: '100%' }}>

        {/* Card 1 — Nuovo appuntamento */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setNewApptCell({ date: todayStr, hour: 9 })}
          onKeyDown={(e) => e.key === 'Enter' && setNewApptCell({ date: todayStr, hour: 9 })}
          style={{ background: '#111827', borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
        >
          {/* Decorative 3D + icon */}
          <img
            src="/img/+_icon.png"
            alt=""
            style={{ position: 'absolute', right: -8, bottom: -8, width: 88, height: 88, objectFit: 'contain', pointerEvents: 'none', opacity: 0.9 }}
          />
          <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 700, color: '#FFF', paddingRight: 72 }}>
            Nuovo appuntamento
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280', lineHeight: 1.5, paddingRight: 72 }}>
            Inserisci manualmente un nuovo appuntamento nel tuo calendario.
          </p>
        </div>

        {/* Card 2 — Mini calendar */}
        <MiniCalendarCard weekStart={weekStart} activeDay={activeDayStr} onNavigate={navigateToDate} />

        {/* Card 3 — Overview Giornata */}
        <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Overview Giornata</span>
            {dayComparison && (
              <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 100, background: dayComparison.diff >= 0 ? '#dcfce7' : '#fee2e2', color: dayComparison.diff >= 0 ? '#15803d' : '#dc2626' }}>
                {dayComparison.diff >= 0 ? '+' : ''}{dayComparison.diff} vs {dayComparison.dayLabel}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
            <GaugeSVG value={completedToday} total={todayAppts.length} />
            <div style={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'Outfit, sans-serif', fontSize: 32, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{todayAppts.length}</span>
            </div>
          </div>
          <p style={{ margin: '4px 0 8px', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Appuntamenti totali</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: '#F3F4F6', color: '#374151' }}>
              {completedToday}/{todayAppts.length} completati
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 100, background: '#111827', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{completedToday} completati</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: 100, background: '#D1D5DB', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{remainingToday} rimanenti</span>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #F3F4F6', marginTop: 10, paddingTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Revenue Giornata</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {todayRevenue > 0 ? `€ ${todayRevenue.toFixed(0)}` : '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Scontrino medio</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                {avgTicket > 0 ? `€ ${avgTicket.toFixed(0)}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Card 4 — Slot vuoto */}
        {nextEmptySlot ? (
          <div style={{ borderRadius: 16, padding: 18, background: '#111827', position: 'relative', overflow: 'hidden' }}>
            {/* Decorative megafono icon */}
            <img
              src="/img/megafono_icon.png"
              alt=""
              style={{ position: 'absolute', right: -8, bottom: -8, width: 90, height: 90, objectFit: 'contain', pointerEvents: 'none', opacity: 0.85 }}
            />
            <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#F97316' }}>Slot vuoto</p>
            <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#FFF', lineHeight: 1.1 }}>
              {nextEmptySlot.start} – {nextEmptySlot.end}
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, paddingRight: 64 }}>
              {parseInt(nextEmptySlot.start) >= 14
                ? "Un'ora libera nel pomeriggio."
                : "Un'ora libera in mattinata."}
            </p>
            <button type="button" style={{ padding: '7px 13px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.12)', color: '#FFF', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Notifica i clienti vicini
            </button>
          </div>
        ) : (
          <div style={{ borderRadius: 16, padding: '14px 16px', background: '#F9FAFB', border: '1px solid #E9E9E9' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Nessuno slot libero oggi</p>
          </div>
        )}
      </div>}

      {visibleRealtimeError && (
        <div
          role="alert"
          style={{
            position: 'fixed',
            right: 16,
            bottom: 16,
            zIndex: 60,
            maxWidth: 360,
            borderRadius: 12,
            background: '#dc2626',
            color: '#fff',
            padding: '12px 16px',
            fontSize: 13,
            fontWeight: 500,
            boxShadow: '0 10px 30px rgba(220,38,38,0.28)',
          }}
        >
          {visibleRealtimeError.message}
        </div>
      )}

      {/* ── Modals ── */}
      {detailAppt && (
        <ApptDetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onUpdated={() => router.refresh()}
          tenantId={tenantId}
          isManagerOrOwner={isManagerOrOwner}
        />
      )}
      {newApptCell && (
        <NewApptModal
          date={newApptCell.date}
          hour={newApptCell.hour}
          onClose={() => setNewApptCell(null)}
          tenantId={tenantId}
          isManagerOrOwner={isManagerOrOwner}
          currentStaffId={currentStaffId}
          onCreated={() => router.refresh()}
          timezone={timezone}
        />
      )}
    </div>
  )
}
