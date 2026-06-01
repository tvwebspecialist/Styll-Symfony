import type {
  CalendarioAppointment,
  CalendarioWorkingHour,
  CalendarioOverride,
} from '@/lib/actions/calendario'
import { formatTimeInTimezone, getLocalMinutes } from '@/lib/utils/timezone'

export const HOUR_HEIGHT = 200
export const HOUR_START = 8
export const HOUR_END = 20
export const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)
export const TIME_COL_W = 64

export const DAYS_FULL = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato']

/** 15-minute time slots from 07:00 to 22:00 */
export const TIME_SLOT_OPTIONS: { value: string; label: string }[] = (() => {
  const slots = []
  for (let h = 7; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      if (h === 22 && m > 0) break
      const hh = String(h).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      slots.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` })
    }
  }
  return slots
})()
export const MONTHS_IT = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
]
export const MONTHS_SHORT = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
export const DAYS_ABBR = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']

export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  taglio:      { bg: '#dbeafe', text: '#1e3a5f', border: '#2563eb' },
  colore:      { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  colorazione: { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  barba:       { bg: '#dcfce7', text: '#14532d', border: '#16a34a' },
  trattamento: { bg: '#ffedd5', text: '#7c2d12', border: '#ea580c' },
  piega:       { bg: '#fce7f3', text: '#831843', border: '#db2777' },
}
export const DEFAULT_COLOR = { bg: '#f3f4f6', text: '#374151', border: '#6b7280' }

export const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confermato',
  pending:   'In attesa',
  completed: 'Completato',
  cancelled: 'Cancellato',
  no_show:   'No show',
}
export const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  confirmed: { bg: '#dcfce7', text: '#15803d' },
  pending:   { bg: '#fef9c3', text: '#a16207' },
  completed: { bg: '#d1fae5', text: '#065f46' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
  no_show:   { bg: '#fee2e2', text: '#dc2626' },
}

export type CalendarView = 'Giorno' | 'Settimana' | 'Mese'

// ── Helpers ────────────────────────────────────────────────────────────────

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10)
}

export function formatHour(h: number): string {
  return `${String(h).padStart(2, '0')}:00`
}

export function formatTime(iso: string, timezone: string = 'Europe/Rome'): string {
  return formatTimeInTimezone(iso, timezone)
}

export function getDurationMin(appt: CalendarioAppointment): number {
  return Math.round(
    (new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000
  )
}

export function getApptPosition(appt: CalendarioAppointment, timezone: string = 'Europe/Rome'): { top: number; height: number } {
  const startMin = getLocalMinutes(appt.start_time, timezone)
  const endMin   = getLocalMinutes(appt.end_time,   timezone)
  const top      = (startMin - HOUR_START * 60) * (HOUR_HEIGHT / 60)
  const height   = Math.max(Math.max(endMin - startMin, 15) * (HOUR_HEIGHT / 60), 24)
  return { top, height }
}

export function getCategoryColor(cat?: string | null) {
  if (!cat) return DEFAULT_COLOR
  return CATEGORY_COLORS[cat.toLowerCase().trim()] ?? DEFAULT_COLOR
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function getMonthYearLabel(weekStart: string): string {
  const end = new Date(weekStart + 'T12:00:00')
  end.setDate(end.getDate() + 5)
  const m = MONTHS_IT[end.getMonth()]!
  return m.charAt(0).toUpperCase() + m.slice(1) + ', ' + end.getFullYear()
}

export function isHourWorking(
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

export function findNextEmptySlot(appts: CalendarioAppointment[]): { start: string; end: string } | null {
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

export function calcTimePos(): number {
  const n = new Date()
  return (n.getHours() * 60 + n.getMinutes() - HOUR_START * 60) * (HOUR_HEIGHT / 60)
}

export function currentTimeStr(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}
