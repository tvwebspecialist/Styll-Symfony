'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type {
  CalendarioAppointment,
  CalendarioData,
  CalendarioWorkingHour,
  CalendarioOverride,
} from '@/lib/actions/calendario'

// ── Constants ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64
const HOUR_START = 8
const HOUR_END = 20
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const DAYS_SHORT = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const MONTHS_IT = [
  'Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
  'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre',
]
const DAYS_ABBR = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  taglio:      { bg: '#dbeafe', text: '#1e3a5f', border: '#2563eb' },
  colore:      { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  colorazione: { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  barba:       { bg: '#dcfce7', text: '#14532d', border: '#16a34a' },
  trattamento: { bg: '#ffedd5', text: '#7c2d12', border: '#ea580c' },
  piega:       { bg: '#fce7f3', text: '#831843', border: '#db2777' },
}
const DEFAULT_COLOR = { bg: '#f3f4f6', text: '#374151', border: '#6b7280' }

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confermato',
  pending:   'In attesa',
  completed: 'Completato',
  cancelled: 'Cancellato',
  no_show:   'No show',
}
const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#dcfce7', text: '#15803d' },
  pending:   { bg: '#fef9c3', text: '#a16207' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  no_show:   { bg: '#fee2e2', text: '#dc2626' },
}

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function getDayDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function getDurationMin(appt: CalendarioAppointment): number {
  return Math.round(
    (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000
  )
}

function getApptPosition(appt: CalendarioAppointment): { top: number; height: number } {
  const start = new Date(appt.start_time)
  const end   = new Date(appt.end_time)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin   = end.getHours() * 60 + end.getMinutes()
  const top    = (startMin - HOUR_START * 60) * (HOUR_HEIGHT / 60)
  const height = Math.max(Math.max(endMin - startMin, 15) * (HOUR_HEIGHT / 60), 24)
  return { top, height }
}

function getCategoryColor(cat?: string | null) {
  if (!cat) return DEFAULT_COLOR
  return CATEGORY_COLORS[cat.toLowerCase().trim()] ?? DEFAULT_COLOR
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

function getMonthYearLabel(weekStart: string): string {
  // Use the month that has more days in the week (end of week)
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 6)
  const m = MONTHS_IT[end.getMonth()]
  return m.charAt(0).toUpperCase() + m.slice(1) + ', ' + end.getFullYear()
}

function isHourWorking(
  staffId: string,
  dayIndex: number,
  dateStr: string,
  hour: number,
  workingHours: CalendarioWorkingHour[],
  overrides: CalendarioOverride[]
): boolean {
  const ov = overrides.find((o) => o.staff_id === staffId && o.date === dateStr)
  if (ov) {
    if (ov.is_closed) return false
    if (ov.start_time && ov.end_time) {
      return hour >= parseInt(ov.start_time.slice(0, 2)) && hour < parseInt(ov.end_time.slice(0, 2))
    }
    return true
  }
  const dbDow = dayIndex === 6 ? 0 : dayIndex + 1
  const rows = workingHours.filter((w) => w.staff_id === staffId && w.day_of_week === dbDow)
  if (rows.length === 0) return !workingHours.some((w) => w.staff_id === staffId)
  return rows.some(
    (wh) => hour >= parseInt(wh.start_time.slice(0, 2)) && hour < parseInt(wh.end_time.slice(0, 2))
  )
}

function findNextEmptySlot(appts: CalendarioAppointment[]): { start: string; end: string } | null {
  const now = new Date()
  for (let h = Math.max(now.getHours() + 1, HOUR_START); h < HOUR_END - 1; h++) {
    const s = h * 60, e = (h + 1) * 60
    const conflict = appts.some((a) => {
      const as = new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes()
      const ae = new Date(a.end_time).getHours() * 60 + new Date(a.end_time).getMinutes()
      return as < e && ae > s
    })
    if (!conflict) return { start: formatHour(h), end: formatHour(h + 1) }
  }
  return null
}

// ── Current time line ──────────────────────────────────────────────────────

function CurrentTimeLine() {
  const calc = () => {
    const n = new Date()
    return (n.getHours() * 60 + n.getMinutes() - HOUR_START * 60) * (HOUR_HEIGHT / 60)
  }
  const [pos, setPos] = React.useState(calc)
  React.useEffect(() => {
    const id = setInterval(() => setPos(calc()), 60_000)
    return () => clearInterval(id)
  }, [])
  if (pos < 0 || pos > (HOUR_END - HOUR_START) * HOUR_HEIGHT) return null
  return (
    <div
      style={{
        position: 'absolute',
        top: pos,
        left: 0,
        right: 0,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{ width: 8, height: 8, borderRadius: 100, background: '#ef4444', flexShrink: 0, marginLeft: -1 }} />
      <div style={{ flex: 1, height: 1, background: '#ef4444' }} />
    </div>
  )
}

// ── Gauge SVG ──────────────────────────────────────────────────────────────

function GaugeSVG({ value, total }: { value: number; total: number }) {
  const r = 44, cx = 56, cy = 52
  const circum = Math.PI * r
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  const d = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`
  return (
    <svg viewBox={`0 0 ${cx * 2} ${cy + 8}`} width={cx * 2} height={cy + 8} style={{ display: 'block' }}>
      <path d={d} fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
      {pct > 0 && (
        <path d={d} fill="none" stroke="#111827" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${pct * circum} ${circum}`} />
      )}
    </svg>
  )
}

// ── Mini calendar card ─────────────────────────────────────────────────────

function MiniCalendarCard({ weekStart }: { weekStart: string }) {
  const init = () => {
    const d = new Date(weekStart + 'T12:00:00')
    return { y: d.getFullYear(), m: d.getMonth() }
  }
  const [view, setView] = React.useState(init)
  const shift = (dir: -1 | 1) =>
    setView((v) => {
      const d = new Date(v.y, v.m + dir)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const firstDow   = new Date(view.y, view.m, 1).getDay()
  const offset     = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const today = new Date()
  const todayNum = today.getDate()
  const isThisMonth = view.y === today.getFullYear() && view.m === today.getMonth()

  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E9E9E9', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
          {MONTHS_IT[view.m]} {view.y}
        </span>
        <div style={{ display: 'flex', gap: 3 }}>
          {([-1, 1] as const).map((dir) => (
            <button key={dir} type="button" onClick={() => shift(dir)}
              style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #E5E7EB', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {dir === -1 ? <ChevronLeft size={11} /> : <ChevronRight size={11} />}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center', marginBottom: 3 }}>
        {['L','M','M','G','V','S','D'].map((l, i) => (
          <div key={i} style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, padding: '2px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center' }}>
        {cells.map((day, i) => {
          const cur = day !== null && isThisMonth && day === todayNum
          return (
            <div key={i} style={{
              width: 24, height: 24, borderRadius: 100, margin: '1px auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: cur ? 700 : 400,
              background: cur ? '#111827' : 'transparent',
              color: day === null ? 'transparent' : cur ? '#FFF' : '#374151',
            }}>
              {day ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  weekStart: string
  data: CalendarioData
  currentStaffId: string | null
  isManagerOrOwner: boolean
  selectedStaffId: string | null
}

// ── Main component ─────────────────────────────────────────────────────────

export function CalendarioClient({ weekStart, data, isManagerOrOwner, selectedStaffId }: Props) {
  const router = useRouter()
  const [detailAppt, setDetailAppt] = React.useState<CalendarioAppointment | null>(null)
  const [newApptCell, setNewApptCell] = React.useState<{ date: string; hour: number } | null>(null)

  const dayDates  = React.useMemo(() => getDayDates(weekStart), [weekStart])
  const todayStr  = new Date().toISOString().slice(0, 10)
  const todayAppts = data.appointments.filter((a) => a.start_time.slice(0, 10) === todayStr)
  const completedToday  = todayAppts.filter((a) => a.status === 'completed').length
  const remainingToday  = todayAppts.filter((a) => ['confirmed', 'pending'].includes(a.status)).length
  const nextEmptySlot   = findNextEmptySlot(todayAppts)

  const dayComparison = React.useMemo(() => {
    const dow = new Date(todayStr + 'T12:00:00').getDay()
    if (dow <= 1) return null
    const prev = addDays(todayStr, -1)
    const tc = data.appointments.filter((a) => a.start_time.slice(0, 10) === todayStr).length
    const pc = data.appointments.filter((a) => a.start_time.slice(0, 10) === prev).length
    return { diff: tc - pc, dayLabel: DAYS_ABBR[new Date(prev + 'T12:00:00').getDay()] }
  }, [data.appointments, todayStr])

  const staffColorMap = React.useMemo(() => {
    const cols = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#ec4899','#06b6d4']
    const map: Record<string, string> = {}
    data.staff.forEach((s, i) => { map[s.id] = cols[i % cols.length] })
    return map
  }, [data.staff])

  function navigate(dir: -1 | 1) {
    const p = new URLSearchParams({ week: addDays(weekStart, dir * 7) })
    if (selectedStaffId) p.set('staff', selectedStaffId)
    router.push(`/dashboard/calendario?${p}`)
  }

  function selectStaff(id: string | null) {
    const p = new URLSearchParams({ week: weekStart })
    if (id) p.set('staff', id)
    router.push(`/dashboard/calendario?${p}`)
  }

  function isCellWorking(date: string, hour: number, dayIdx: number): boolean {
    if (data.staff.length === 0) return true
    const check = selectedStaffId ? data.staff.filter((s) => s.id === selectedStaffId) : data.staff
    return check.some((s) => isHourWorking(s.id, dayIdx, date, hour, data.workingHours, data.overrides))
  }

  // MainContent: marginTop 104, paddingTop 24, paddingBottom 24, marginBottom 16 → 168px
  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 168px)', overflow: 'hidden' }}>

      {/* ── CENTER ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#111827', lineHeight: 1 }}>
            {getMonthYearLabel(weekStart)}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 100, padding: 3, gap: 2 }}>
              {(['Giorno','Settimana','Mese'] as const).map((v) => (
                <button key={v} type="button" style={{
                  padding: '5px 14px', borderRadius: 100, border: 'none',
                  background: v === 'Settimana' ? '#111827' : 'transparent',
                  fontSize: 12, fontWeight: v === 'Settimana' ? 600 : 400,
                  color: v === 'Settimana' ? '#FFF' : '#9CA3AF', cursor: 'pointer',
                }}>{v}</button>
              ))}
            </div>
            {/* Week nav */}
            {([-1, 1] as const).map((dir) => (
              <button key={dir} type="button" onClick={() => navigate(dir)}
                aria-label={dir === -1 ? 'Settimana precedente' : 'Settimana successiva'}
                style={{ width: 32, height: 32, borderRadius: 100, border: '1px solid #E5E7EB', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {dir === -1 ? <ChevronLeft size={15} color="#374151" /> : <ChevronRight size={15} color="#374151" />}
              </button>
            ))}
          </div>
        </div>

        {/* Staff pills */}
        {isManagerOrOwner && data.staff.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10, flexShrink: 0 }}>
            <button type="button" onClick={() => selectStaff(null)} style={{
              padding: '4px 12px', borderRadius: 100, border: `1.5px solid ${!selectedStaffId ? '#111827' : '#E5E7EB'}`,
              background: !selectedStaffId ? '#111827' : '#FFF', color: !selectedStaffId ? '#FFF' : '#6B7280',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
            }}>Tutti</button>
            {data.staff.map((s) => {
              const active = selectedStaffId === s.id
              const col = staffColorMap[s.id] ?? '#374151'
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

        {/* Calendar card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', overflow: 'hidden' }}>

          {/* Sticky day headers */}
          <div style={{ display: 'flex', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
            <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid #F0F0F0', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>Ora</span>
            </div>
            {dayDates.map((date, i) => {
              const today = isToday(date)
              return (
                <div key={date} style={{ flex: 1, height: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: i < 6 ? '1px solid #F0F0F0' : 'none', gap: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: today ? '#111827' : '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {DAYS_SHORT[i]}
                  </span>
                  <span style={{ width: 28, height: 28, borderRadius: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, background: today ? '#111827' : 'transparent', color: today ? '#FFF' : '#111827' }}>
                    {new Date(date + 'T12:00:00').getDate()}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Scrollable grid */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex' }}>
              {/* Time column */}
              <div style={{ width: 52, flexShrink: 0, borderRight: '1px solid #F0F0F0' }}>
                {HOURS.map((h) => (
                  <div key={h} style={{ height: HOUR_HEIGHT, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 5, borderBottom: '1px solid #F9FAFB' }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 500 }}>{formatHour(h)}</span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
                <CurrentTimeLine />
                {dayDates.map((date, dayIdx) => {
                  const dayAppts = data.appointments.filter((a) => a.start_time.slice(0, 10) === date)
                  const todayCol = isToday(date)
                  return (
                    <div key={date} style={{ flex: 1, borderRight: dayIdx < 6 ? '1px solid #F0F0F0' : 'none', background: todayCol ? 'rgba(17,24,39,0.015)' : 'transparent' }}>
                      <div style={{ position: 'relative' }}>
                        {HOURS.map((h) => {
                          const working = isCellWorking(date, h, dayIdx)
                          return (
                            <div key={h} onClick={() => setNewApptCell({ date, hour: h })}
                              style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F9FAFB', background: !working ? 'rgba(0,0,0,0.012)' : 'transparent', cursor: 'pointer' }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(17,24,39,0.04)' }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = !working ? 'rgba(0,0,0,0.012)' : 'transparent' }}
                            />
                          )
                        })}

                        {dayAppts.map((appt) => {
                          const { top, height } = getApptPosition(appt)
                          const col = getCategoryColor(appt.services[0]?.category)
                          const dur = getDurationMin(appt)
                          const compact = height < 42
                          const walkIn  = appt.booking_source === 'walk_in'
                          const sb = STATUS_BADGE[appt.status] ?? { bg: '#F3F4F6', text: '#374151' }

                          let opacity = 1
                          if (appt.status === 'cancelled') opacity = 0.32
                          else if (appt.status === 'completed') opacity = 0.55
                          else if (appt.status === 'pending')   opacity = 0.72

                          const textDeco   = appt.status === 'cancelled' ? 'line-through' : 'none'
                          const bdrStyle   = appt.status === 'pending' ? 'dashed' : 'solid'
                          const blockBg    = todayCol ? '#2a2a2a' : '#FFFFFF'
                          const bdrColor   = todayCol ? '#3d3d3d' : '#E5E5E5'
                          const textColor  = todayCol ? '#FFFFFF' : '#111827'
                          const subColor   = todayCol ? '#A0A0A0' : '#6B7280'
                          const accentCol  = todayCol ? '#555' : col.border

                          return (
                            <div key={appt.id} role="button" tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); setDetailAppt(appt) }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDetailAppt(appt) } }}
                              style={{
                                position: 'absolute', top: top + 2, left: 3, right: 3, height: height - 4,
                                background: blockBg, borderRadius: 10, opacity,
                                borderTop: `1px ${bdrStyle} ${bdrColor}`,
                                borderRight: `1px ${bdrStyle} ${bdrColor}`,
                                borderBottom: `1px ${bdrStyle} ${bdrColor}`,
                                borderLeft: `3px solid ${accentCol}`,
                                padding: compact ? '3px 6px' : '6px 8px',
                                cursor: 'pointer', overflow: 'hidden', zIndex: 2,
                                transition: 'transform 80ms ease',
                              }}
                              onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1.02)'; el.style.zIndex = '10' }}
                              onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'scale(1)'; el.style.zIndex = '2' }}
                            >
                              {compact ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: textColor, textDecoration: textDeco, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {walkIn && '🚶 '}{appt.client_name}
                                  </span>
                                  <span style={{ fontSize: 9, color: subColor, flexShrink: 0 }}>{formatTime(appt.start_time)}</span>
                                </div>
                              ) : (
                                <>
                                  {/* Status badge */}
                                  <div style={{ position: 'absolute', top: 5, right: 6 }}>
                                    <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 100, background: todayCol ? 'rgba(255,255,255,0.15)' : sb.bg, color: todayCol ? '#fff' : sb.text, whiteSpace: 'nowrap' }}>
                                      {STATUS_LABELS[appt.status] ?? appt.status}
                                    </span>
                                  </div>
                                  {/* Avatar + name */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, paddingRight: 58 }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 100, background: todayCol ? '#444' : col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: todayCol ? '#fff' : col.text, flexShrink: 0, border: `1px solid ${todayCol ? '#555' : col.border + '40'}` }}>
                                      {getInitials(appt.client_name)}
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 700, color: textColor, textDecoration: textDeco, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {walkIn && '🚶 '}{appt.client_name}
                                    </span>
                                  </div>
                                  {/* Time */}
                                  <div style={{ fontSize: 10, color: subColor, lineHeight: 1.3 }}>
                                    {formatTime(appt.start_time)} · {dur}min
                                  </div>
                                  {/* Service */}
                                  {height > 62 && appt.services.length > 0 && (
                                    <div style={{ fontSize: 10, color: subColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                                      {appt.services.map((s) => s.name).join(', ')}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ width: 292, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

        {/* Card 1 — Nuovo appuntamento */}
        <div style={{ background: '#111827', borderRadius: 16, padding: '18px 18px 20px', position: 'relative' }}>
          <button type="button" onClick={() => setNewApptCell({ date: todayStr, hour: 9 })}
            style={{ position: 'absolute', top: 16, right: 16, width: 36, height: 36, borderRadius: 100, background: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Plus size={18} color="#FFF" />
          </button>
          <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 700, color: '#FFF', paddingRight: 44 }}>
            Nuovo appuntamento
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280', lineHeight: 1.5, paddingRight: 8 }}>
            Inserisci manualmente un nuovo appuntamento nel tuo calendario.
          </p>
        </div>

        {/* Card 2 — Mini calendario */}
        <MiniCalendarCard weekStart={weekStart} />

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
            <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{todayAppts.length}</span>
            </div>
          </div>
          <p style={{ margin: '4px 0 10px', fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>Appuntamenti</p>
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
        </div>

        {/* Card 4 — Slot vuoto */}
        {nextEmptySlot ? (
          <div style={{ borderRadius: 16, padding: '18px 18px 20px', background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 55%, #831843 100%)' }}>
            <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#FFF' }}>Slot vuoto</p>
            <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#FFF', lineHeight: 1.1 }}>
              {nextEmptySlot.start} - {nextEmptySlot.end}
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              Un&apos;ora libera nel pomeriggio.
            </p>
            <button type="button" style={{ padding: '7px 13px', borderRadius: 8, border: 'none', background: 'rgba(255,255,255,0.9)', color: '#1e1b4b', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              Notifica i clienti vicini
            </button>
          </div>
        ) : (
          <div style={{ borderRadius: 16, padding: '14px 16px', background: '#F9FAFB', border: '1px solid #E9E9E9' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>Nessuno slot libero oggi</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {detailAppt && <ApptDetailModal appt={detailAppt} onClose={() => setDetailAppt(null)} />}
      {newApptCell && <NewApptModal date={newApptCell.date} hour={newApptCell.hour} onClose={() => setNewApptCell(null)} />}
    </div>
  )
}

// ── Detail modal ───────────────────────────────────────────────────────────

function ApptDetailModal({ appt, onClose }: { appt: CalendarioAppointment; onClose: () => void }) {
  const sc = STATUS_BADGE[appt.status] ?? { bg: '#F3F4F6', text: '#374151' }
  const dateLabel = new Date(appt.start_time).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
            {appt.booking_source === 'walk_in' && <span style={{ fontSize: 12 }}>🚶 Walk-in</span>}
          </div>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 100, border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#374151" />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 100, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: '#374151' }}>
            {getInitials(appt.client_name)}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{appt.client_name}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{dateLabel}</p>
          </div>
        </div>
        {appt.services.length > 0 && (
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
            {appt.services.map((s) => {
              const col = getCategoryColor(s.category)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 100, background: col.border, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{s.duration_minutes} min</span>
                </div>
              )
            })}
          </div>
        )}
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</span>
          <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {getDurationMin(appt)}min</span>
          {appt.notes && <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {appt.notes}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href={`/dashboard/clienti/${appt.client_id}`} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 10, border: '1px solid #E9E9E9', background: '#FFF', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}>
            Vai al cliente
          </Link>
          <button type="button" style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Modifica
          </button>
        </div>
      </div>
    </div>
  )
}

// ── New appointment modal ──────────────────────────────────────────────────

function NewApptModal({ date, hour, onClose }: { date: string; hour: number; onClose: () => void }) {
  const label = new Date(date + 'T12:00:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Nuovo appuntamento</h3>
          <button type="button" onClick={onClose} style={{ width: 28, height: 28, borderRadius: 100, border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#374151" />
          </button>
        </div>
        <p style={{ margin: '0 0 2px', fontSize: 12, color: '#9CA3AF' }}>{label}</p>
        <p style={{ margin: '0 0 14px', fontSize: 24, fontWeight: 800, color: '#111827' }}>{formatHour(hour)}</p>
        <p style={{ margin: '0 0 18px', fontSize: 13, color: '#9CA3AF', lineHeight: 1.6 }}>
          La creazione guidata degli appuntamenti sarà presto disponibile. Per ora, usa la sezione Vendite.
        </p>
        <Link href="/dashboard/vendite" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', borderRadius: 10, background: '#111827', color: '#FFF', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
          Vai alle Vendite
        </Link>
      </div>
    </div>
  )
}
