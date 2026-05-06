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
import {
  updateAppointmentStatus,
  createAppointment,
  getCalendarioFormOptions,
  getStaffLocations,
} from '@/lib/actions/calendario'
// ── Constants ──────────────────────────────────────────────────────────────

const HOUR_HEIGHT = 64
const HOUR_START = 8
const HOUR_END = 20
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
const TIME_COL_W = 64

const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']
const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const DAYS_ABBR = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

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

type CalendarView = 'Giorno' | 'Settimana' | 'Mese'

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
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
  const start    = new Date(appt.start_time)
  const end      = new Date(appt.end_time)
  const startMin = start.getHours() * 60 + start.getMinutes()
  const endMin   = end.getHours()   * 60 + end.getMinutes()
  const top      = (startMin - HOUR_START * 60) * (HOUR_HEIGHT / 60)
  const height   = Math.max(Math.max(endMin - startMin, 15) * (HOUR_HEIGHT / 60), 24)
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
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 5)
  const m = MONTHS_IT[end.getMonth()]!
  return m.charAt(0).toUpperCase() + m.slice(1) + ', ' + end.getFullYear()
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  const dow = DAYS_FULL[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? DAYS_ABBR[d.getDay()]
  const m = MONTHS_IT[d.getMonth()]!
  return `${dow}, ${d.getDate()} ${m.charAt(0).toUpperCase() + m.slice(1)} ${d.getFullYear()}`
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
  const rows  = workingHours.filter((w) => w.staff_id === staffId && w.day_of_week === dbDow)
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
      const as2 = new Date(a.start_time).getHours() * 60 + new Date(a.start_time).getMinutes()
      const ae  = new Date(a.end_time).getHours()   * 60 + new Date(a.end_time).getMinutes()
      return as2 < e && ae > s
    })
    if (!conflict) return { start: formatHour(h), end: formatHour(h + 1) }
  }
  return null
}

function calcTimePos(): number {
  const n = new Date()
  return (n.getHours() * 60 + n.getMinutes() - HOUR_START * 60) * (HOUR_HEIGHT / 60)
}

function currentTimeStr(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

// ── Current time indicator ─────────────────────────────────────────────────

function CurrentTimeIndicator() {
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

function GaugeSVG({ value, total }: { value: number; total: number }) {
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

function MiniCalendarCard({
  weekStart,
  onNavigate,
}: {
  weekStart: string
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
        {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((l, i) => (
          <div key={i} style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, padding: '2px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', textAlign: 'center' }}>
        {cells.map((day, i) => {
          const cur = day !== null && isThisMonth && day === todayNum
          return (
            <div
              key={i}
              onClick={() => day !== null && handleDayClick(day)}
              style={{
                width: 24, height: 24, borderRadius: 100, margin: '1px auto',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: cur ? 700 : 400,
                background: cur ? '#111827' : 'transparent',
                color: day === null ? 'transparent' : cur ? '#FFF' : '#374151',
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

// ── Appointment detail modal ───────────────────────────────────────────────

function ApptDetailModal({
  appt,
  onClose,
  onUpdated,
}: {
  appt: CalendarioAppointment
  onClose: () => void
  onUpdated: () => void
}) {
  const [editing, setEditing]       = React.useState(false)
  const [editStatus, setEditStatus] = React.useState(appt.status)
  const [editNotes, setEditNotes]   = React.useState(appt.notes ?? '')
  const [saving, setSaving]         = React.useState(false)
  const [saveError, setSaveError]   = React.useState<string | null>(null)

  const sc  = STATUS_BADGE[appt.status] ?? { bg: '#F3F4F6', text: '#374151' }
  const col = getCategoryColor(appt.services[0]?.category)
  const dateLabel = new Date(appt.start_time).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const res = await updateAppointmentStatus(appt.id, editStatus, editNotes || null)
    setSaving(false)
    if (!res.success) { setSaveError(res.error ?? 'Errore durante il salvataggio'); return }
    onUpdated()
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
              {STATUS_LABELS[appt.status] ?? appt.status}
            </span>
            {appt.booking_source === 'walk_in' && <span style={{ fontSize: 12 }}>🚶 Walk-in</span>}
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 100, border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#374151" />
          </button>
        </div>

        {/* Client */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 100, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: col.text }}>
            {getInitials(appt.client_name)}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{appt.client_name}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{dateLabel}</p>
          </div>
        </div>

        {/* Services */}
        {appt.services.length > 0 && (
          <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
            {appt.services.map((s) => {
              const sc2 = getCategoryColor(s.category)
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: 100, background: sc2.border, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, flex: 1 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{s.duration_minutes} min</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Time */}
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</span>
          <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {getDurationMin(appt)}min</span>
          {appt.notes && !editing && <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {appt.notes}</span>}
        </div>

        {/* Edit form or action buttons */}
        {editing ? (
          <div>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stato</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} style={inputStyle}>
                {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                  <option key={val} value={val}>{lbl}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Note</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            {saveError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#dc2626' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setEditing(false); setSaveError(null) }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E9E9E9', background: '#FFF', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Annulla
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: appt.status !== 'cancelled' ? 10 : 0 }}>
              <Link
                href={`/clienti/${appt.client_id}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 10, border: '1px solid #E9E9E9', background: '#FFF', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}
              >
                Vai al cliente
              </Link>
              <button type="button" onClick={() => setEditing(true)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Modifica
              </button>
            </div>
            {appt.status !== 'cancelled' && (
              <button
                type="button"
                onClick={() => { setEditStatus('cancelled'); setEditing(true) }}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #dc2626', background: '#FFF', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancella appuntamento
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── New appointment modal ──────────────────────────────────────────────────

interface FormOptions {
  clients:  Array<{ id: string; full_name: string | null }>
  staff:    Array<{ id: string; full_name: string | null }>
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number }>
}

function NewApptModal({
  date,
  hour,
  onClose,
  tenantId,
  isManagerOrOwner,
  currentStaffId,
  onCreated,
}: {
  date: string
  hour: number
  onClose: () => void
  tenantId: string
  isManagerOrOwner: boolean
  currentStaffId: string | null
  onCreated: () => void
}) {
  const [options, setOptions]           = React.useState<FormOptions | null>(null)
  const [loadingOptions, setLoading]    = React.useState(true)
  const [clientId, setClientId]         = React.useState('')
  const [serviceId, setServiceId]       = React.useState('')
  const [staffId, setStaffId]           = React.useState(currentStaffId ?? '')
  const [locationId, setLocationId]     = React.useState('')
  const [locations, setLocations]       = React.useState<Array<{ id: string; name: string }>>([])
  const [apptDate, setApptDate]         = React.useState(date)
  const [apptTime, setApptTime]         = React.useState(`${String(hour).padStart(2, '0')}:00`)
  const [notes, setNotes]               = React.useState('')
  const [submitting, setSubmitting]     = React.useState(false)
  const [error, setError]               = React.useState<string | null>(null)

  // Load form options once
  React.useEffect(() => {
    getCalendarioFormOptions(tenantId)
      .then((opts) => {
        setOptions(opts)
        if (!currentStaffId && opts.staff[0]) setStaffId(opts.staff[0].id)
        if (opts.services[0]) setServiceId(opts.services[0].id)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tenantId, currentStaffId])

  // Reload locations whenever selected staff changes
  React.useEffect(() => {
    if (!staffId) return
    getStaffLocations(staffId, tenantId).then((locs) => {
      setLocations(locs)
      if (locs.length === 1) {
        setLocationId(locs[0].id)
      } else if (locs.length > 1) {
        setLocationId((prev) => (locs.find((l) => l.id === prev) ? prev : locs[0].id))
      } else {
        setLocationId('')
      }
    })
  }, [staffId, tenantId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !serviceId || !staffId) { setError('Seleziona cliente, servizio e staff'); return }
    if (!locationId) { setError('Configura almeno una location per questo membro dello staff'); return }
    setSubmitting(true)
    setError(null)
    const svc = options?.services.find((s) => s.id === serviceId)
    const dur = svc?.duration_minutes ?? 60
    const start = new Date(`${apptDate}T${apptTime}:00`)
    const end   = new Date(start.getTime() + dur * 60000)
    const res = await createAppointment({
      tenantId, clientId, staffId,
      locationId,
      serviceIds: [serviceId],
      startTime: start.toISOString(),
      endTime:   end.toISOString(),
      notes: notes || null,
    })
    setSubmitting(false)
    if (!res.success) { setError(res.error ?? 'Errore durante la creazione'); return }
    onCreated()
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4,
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Nuovo appuntamento</h3>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 100, border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#374151" />
          </button>
        </div>

        {loadingOptions ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: '20px 0' }}>Caricamento…</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Data</label>
                <input type="date" value={apptDate} onChange={(e) => setApptDate(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Ora</label>
                <input type="time" value={apptTime} onChange={(e) => setApptTime(e.target.value)} style={inputStyle} required />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Cliente</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={inputStyle} required>
                <option value="">Seleziona cliente…</option>
                {options?.clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name ?? 'Cliente senza nome'}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Servizio</label>
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} style={inputStyle} required>
                <option value="">Seleziona servizio…</option>
                {options?.services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.duration_minutes} min)</option>
                ))}
              </select>
            </div>
            {isManagerOrOwner && (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Staff</label>
                <select value={staffId} onChange={(e) => setStaffId(e.target.value)} style={inputStyle} required>
                  <option value="">Seleziona staff…</option>
                  {options?.staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name ?? 'Staff'}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Location selector */}
            {locations.length === 0 && staffId ? (
              <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 12, color: '#c2410c' }}>
                  ⚠️ Questo membro dello staff non ha location assegnate. Configura almeno una location.
                </p>
              </div>
            ) : locations.length > 1 ? (
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Location</label>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} style={inputStyle} required>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            ) : null /* single location: auto-assigned, no UI needed */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Note (opzionale)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            {error && <p style={{ margin: '0 0 10px', fontSize: 12, color: '#dc2626' }}>{error}</p>}
            <button type="submit" disabled={submitting || !locationId}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: (submitting || !locationId) ? 'not-allowed' : 'pointer', opacity: (submitting || !locationId) ? 0.5 : 1 }}>
              {submitting ? 'Creazione…' : 'Crea appuntamento'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  weekStart: string
  dayView?: string | null
  data: CalendarioData
  currentStaffId: string | null
  isManagerOrOwner: boolean
  selectedStaffId: string | null
}

// ── Main component ─────────────────────────────────────────────────────────

export function CalendarioClient({
  tenantId,
  weekStart,
  dayView,
  data,
  currentStaffId,
  isManagerOrOwner,
  selectedStaffId,
}: Props) {
  const router = useRouter()

  const [view, setView]             = React.useState<CalendarView>(dayView ? 'Giorno' : 'Settimana')
  const [detailAppt, setDetailAppt] = React.useState<CalendarioAppointment | null>(null)
  const [newApptCell, setNewApptCell] = React.useState<{ date: string; hour: number } | null>(null)

  const todayStr  = React.useMemo(() => new Date().toISOString().slice(0, 10), [])
  const activeDayStr = dayView ?? todayStr

  // 6-column week (Mon–Sat)
  const dayDates = React.useMemo(
    () => Array.from({ length: 6 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const todayAppts     = data.appointments.filter((a) => a.start_time.slice(0, 10) === todayStr)
  const completedToday = todayAppts.filter((a) => a.status === 'completed').length
  const remainingToday = todayAppts.filter((a) => ['confirmed', 'pending'].includes(a.status)).length
  const nextEmptySlot  = findNextEmptySlot(todayAppts)

  const dayComparison = React.useMemo(() => {
    const dow = new Date(todayStr + 'T12:00:00').getDay()
    if (dow <= 1) return null
    const prev = addDays(todayStr, -1)
    const tc   = data.appointments.filter((a) => a.start_time.slice(0, 10) === todayStr).length
    const pc   = data.appointments.filter((a) => a.start_time.slice(0, 10) === prev).length
    return { diff: tc - pc, dayLabel: DAYS_ABBR[new Date(prev + 'T12:00:00').getDay()] }
  }, [data.appointments, todayStr])

  const staffColorMap = React.useMemo(() => {
    const cols = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4']
    const map: Record<string, string> = {}
    data.staff.forEach((s, i) => { map[s.id] = cols[i % cols.length] })
    return map
  }, [data.staff])

  function navigate(dir: -1 | 1) {
    if (view === 'Giorno') {
      const newDay = addDays(activeDayStr, dir)
      const p = new URLSearchParams({ day: newDay })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    } else {
      const p = new URLSearchParams({ week: addDays(weekStart, dir * 7) })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    }
  }

  function navigateToDate(dateStr: string) {
    const p = new URLSearchParams({ week: dateStr })
    if (selectedStaffId) p.set('staff', selectedStaffId)
    router.push(`/calendario?${p}`)
  }

  function handleViewChange(v: CalendarView) {
    setView(v)
    if (v === 'Giorno') {
      const p = new URLSearchParams({ day: todayStr })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    } else if (v === 'Settimana') {
      const p = new URLSearchParams({ week: weekStart })
      if (selectedStaffId) p.set('staff', selectedStaffId)
      router.push(`/calendario?${p}`)
    }
  }

  function selectStaff(id: string | null) {
    if (view === 'Giorno') {
      const p = new URLSearchParams({ day: activeDayStr })
      if (id) p.set('staff', id)
      router.push(`/calendario?${p}`)
    } else {
      const p = new URLSearchParams({ week: weekStart })
      if (id) p.set('staff', id)
      router.push(`/calendario?${p}`)
    }
  }

  function isCellWorking(date: string, hour: number, dayIdx: number): boolean {
    if (data.staff.length === 0) return true
    const check = selectedStaffId
      ? data.staff.filter((s) => s.id === selectedStaffId)
      : data.staff
    return check.some((s) =>
      isHourWorking(s.id, dayIdx, date, hour, data.workingHours, data.overrides)
    )
  }

  // Shared renderer for a single day column (used in both week and day views)
  function renderDayColumn(date: string, dayIdx: number, isFullWidth: boolean) {
    const dayAppts = data.appointments.filter((a) => a.start_time.slice(0, 10) === date)
    const todayCol = isToday(date)
    return (
      <div key={date} style={{ flex: 1, borderRight: isFullWidth ? 'none' : dayIdx < 5 ? '1px solid #F0F0F0' : 'none', background: todayCol ? 'rgba(17,24,39,0.015)' : 'transparent' }}>
        <div style={{ position: 'relative' }}>
          {HOURS.map((h) => {
            const working = isCellWorking(date, h, dayIdx)
            return (
              <div
                key={h}
                onClick={() => setNewApptCell({ date, hour: h })}
                style={{ height: HOUR_HEIGHT, borderBottom: '1px solid #F9FAFB', background: working ? 'transparent' : 'rgba(0,0,0,0.012)', cursor: 'pointer' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(17,24,39,0.04)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = working ? 'transparent' : 'rgba(0,0,0,0.012)' }}
              />
            )
          })}

          {dayAppts.map((appt) => {
            const { top, height } = getApptPosition(appt)
            const col       = getCategoryColor(appt.services[0]?.category)
            const dur       = getDurationMin(appt)
            const compact   = height <= 48
            const sb        = STATUS_BADGE[appt.status] ?? { bg: '#F3F4F6', text: '#374151' }
            const isDone    = appt.status === 'completed' || appt.status === 'cancelled'
            const textDeco  = appt.status === 'cancelled' ? 'line-through' as const : 'none' as const
            const blockBg   = todayCol ? '#2a2a2a' : '#FFFFFF'
            const textColor = todayCol ? '#FFFFFF' : '#111827'
            const subColor  = todayCol ? '#A0A0A0' : '#6B7280'
            let opacity = 1
            if (appt.status === 'cancelled') opacity = 0.32
            else if (appt.status === 'completed') opacity = 0.55
            else if (appt.status === 'pending')   opacity = 0.72

            return (
              <div
                key={appt.id}
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); setDetailAppt(appt) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setDetailAppt(appt) } }}
                style={{
                  position: 'absolute', top: top + 2, left: 3, right: 3, height: height - 4,
                  background: blockBg, borderRadius: 10, opacity,
                  borderLeft: `3px solid ${col.border}`,
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
                      {appt.client_name}
                    </span>
                    <span style={{ fontSize: 9, color: subColor, flexShrink: 0 }}>
                      {formatTime(appt.start_time)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 2 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 100, background: todayCol ? '#444' : col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: todayCol ? '#fff' : col.text, flexShrink: 0 }}>
                        {getInitials(appt.client_name)}
                      </div>
                      {isDone ? (
                        <span style={{ fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 100, background: todayCol ? 'rgba(255,255,255,0.15)' : sb.bg, color: todayCol ? '#fff' : sb.text, whiteSpace: 'nowrap' }}>
                          {STATUS_LABELS[appt.status] ?? appt.status}
                        </span>
                      ) : (
                        <span
                          style={{ color: subColor, display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                          onClick={(e) => { e.stopPropagation(); setDetailAppt(appt) }}
                        >
                          ···
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: textColor, textDecoration: textDeco, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                      {appt.client_name}
                    </div>
                    <div style={{ fontSize: 10, color: subColor, lineHeight: 1.3 }}>
                      {formatTime(appt.start_time)}–{formatTime(appt.end_time)} · {dur}min
                    </div>
                    {height > 62 && appt.services.length > 0 && (
                      <div style={{ fontSize: 10, color: subColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, marginTop: 1 }}>
                        {appt.services.map((s) => s.name).join(' + ')}
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
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 168px)', overflow: 'hidden' }}>

      {/* ── LEFT: calendar ── */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
          <h1 style={{
            margin: 0, fontFamily: 'Outfit, sans-serif',
            fontSize: 36, fontWeight: 500, color: '#222222',
            letterSpacing: '-0.9px', lineHeight: 'normal',
          }}>
            {view === 'Giorno' ? getDayLabel(activeDayStr) : getMonthYearLabel(weekStart)}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#F3F4F6', borderRadius: 100, padding: 3 }}>
              {(['Giorno', 'Settimana', 'Mese'] as const).map((v) => (
                <button key={v} type="button" onClick={() => handleViewChange(v)}
                  style={{
                    padding: '6px 16px', borderRadius: 100, border: 'none',
                    background: view === v ? '#111827' : 'transparent',
                    fontSize: 13, fontWeight: view === v ? 600 : 400,
                    color: view === v ? '#FFF' : '#9CA3AF', cursor: 'pointer',
                  }}>
                  {v}
                </button>
              ))}
            </div>
            {/* Navigator */}
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E5E7EB', borderRadius: 100, background: '#FFF', overflow: 'hidden' }}>
              <button type="button" onClick={() => navigate(-1)} aria-label="Precedente"
                style={{ width: 32, height: 32, border: 'none', borderRight: '1px solid #E5E7EB', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronLeft size={14} color="#374151" />
              </button>
              <span style={{ padding: '0 16px', fontSize: 12, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap' }}>
                {view === 'Giorno' ? 'Giorno' : 'Settimana'}
              </span>
              <button type="button" onClick={() => navigate(1)} aria-label="Successiva"
                style={{ width: 32, height: 32, border: 'none', borderLeft: '1px solid #E5E7EB', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <ChevronRight size={14} color="#374151" />
              </button>
            </div>
          </div>
        </div>

        {/* Staff filter pills */}
        {isManagerOrOwner && data.staff.length > 1 && (
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

        {/* Calendar card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFF', borderRadius: 16, border: '1px solid #E9E9E9', overflow: 'hidden' }}>

          {view === 'Mese' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 36 }}>🗓️</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Prossimamente</span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>La vista mese sarà disponibile presto.</span>
            </div>
          ) : view === 'Giorno' ? (
            <>
              {/* Day header — single column */}
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
        </div>
      </div>

      {/* ── RIGHT SIDEBAR ── */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

        {/* Card 1 — Nuovo appuntamento */}
        <div style={{ background: '#111827', borderRadius: 16, padding: 18, position: 'relative' }}>
          <button
            type="button"
            onClick={() => setNewApptCell({ date: todayStr, hour: 9 })}
            style={{ position: 'absolute', top: 12, right: 12, width: 48, height: 48, borderRadius: 14, background: '#2563eb', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}
          >
            <Plus size={22} color="#FFF" strokeWidth={2.5} />
          </button>
          <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 700, color: '#FFF', paddingRight: 56 }}>
            Nuovo appuntamento
          </p>
          <p style={{ margin: 0, fontSize: 11, color: '#6B7280', lineHeight: 1.5 }}>
            Inserisci manualmente un nuovo appuntamento nel tuo calendario.
          </p>
        </div>

        {/* Card 2 — Mini calendar */}
        <MiniCalendarCard weekStart={weekStart} onNavigate={navigateToDate} />

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
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>—</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: '#9CA3AF', marginBottom: 2 }}>Scontrino medio</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>—</div>
            </div>
          </div>
        </div>

        {/* Card 4 — Slot vuoto */}
        {nextEmptySlot ? (
          <div style={{ borderRadius: 16, padding: 18, background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 55%, #831843 100%)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -8, right: -8, fontSize: 52, opacity: 0.18, pointerEvents: 'none', userSelect: 'none' }}>🔊</div>
            <p style={{ margin: '0 0 3px', fontSize: 12, fontWeight: 700, color: '#FFF' }}>Slot vuoto</p>
            <p style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#FFF', lineHeight: 1.1 }}>
              {nextEmptySlot.start} – {nextEmptySlot.end}
            </p>
            <p style={{ margin: '0 0 14px', fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              {parseInt(nextEmptySlot.start) >= 14
                ? "Un'ora libera nel pomeriggio."
                : "Un'ora libera in mattinata."}
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
      {detailAppt && (
        <ApptDetailModal
          appt={detailAppt}
          onClose={() => setDetailAppt(null)}
          onUpdated={() => router.refresh()}
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
        />
      )}
    </div>
  )
}
