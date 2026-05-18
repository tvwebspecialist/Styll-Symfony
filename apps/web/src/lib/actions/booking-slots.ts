import { createAdminClient } from '@/lib/supabase/admin'

export interface SlotItem {
  time: string
  available: boolean
}

export interface GetAvailableSlotsResult {
  slots: SlotItem[]
  isWorkingDay: boolean
  reason?: string
}

/** @deprecated Use GetAvailableSlotsResult instead */
export interface AvailableSlot {
  time: string
  staffId: string
}

interface GetAvailableSlotsParams {
  tenantId: string
  staffId: string
  /** @deprecated No longer used for slot calculation — staff is pre-selected in the new flow */
  locationId?: string
  serviceIds: string[]
  date: string
  timezone?: string
}

interface AppointmentWindow {
  start_time: string
  end_time: string
}

interface WorkingHoursRow {
  start_time: string
  end_time: string
}

interface OverrideRow {
  date: string
  is_closed: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
}

/** Slot grid advances every 30 minutes regardless of appointment duration */
const SLOT_STEP_MINUTES = 30
const DEFAULT_TIMEZONE = 'Europe/Rome'

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(value: number): string {
  const hours = String(Math.floor(value / 60)).padStart(2, '0')
  const minutes = String(value % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function addDays(date: string, amount: number): string {
  const current = new Date(`${date}T12:00:00Z`)
  current.setUTCDate(current.getUTCDate() + amount)
  return current.toISOString().slice(0, 10)
}

function getDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay()
}

function getTimeZoneParts(isoString: string, timezone: string): { date: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date(isoString))
  const map = new Map(parts.map((part) => [part.type, part.value]))
  const date = `${map.get('year')}-${map.get('month')}-${map.get('day')}`
  const minutes = Number(map.get('hour') ?? '0') * 60 + Number(map.get('minute') ?? '0')

  return { date, minutes }
}

function getNowInTimeZone(timezone: string): { date: string; minutes: number } {
  return getTimeZoneParts(new Date().toISOString(), timezone)
}

export async function getAvailableSlots({
  tenantId,
  staffId,
  serviceIds,
  date,
  timezone = DEFAULT_TIMEZONE,
}: GetAvailableSlotsParams): Promise<GetAvailableSlotsResult> {
  if (serviceIds.length === 0) {
    return { slots: [], isWorkingDay: false, reason: 'Nessun servizio selezionato' }
  }

  const db = createAdminClient()
  const nextDate = addDays(date, 1)
  const dayOfWeek = getDayOfWeek(date)
  const now = getNowInTimeZone(timezone)

  // Past dates: skip DB calls entirely
  if (date < now.date) {
    return { slots: [], isWorkingDay: true }
  }

  // Fetch service durations and overrides in parallel
  const [{ data: serviceRows }, { data: overrideRows }] = await Promise.all([
    db.from('services').select('id, duration_minutes').eq('tenant_id', tenantId).in('id', serviceIds),
    db
      .from('working_hour_overrides')
      .select('date, is_closed, start_time, end_time, reason')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffId)
      .eq('date', date),
  ])

  const totalDuration =
    ((serviceRows ?? []) as Array<{ duration_minutes: number }>).reduce(
      (total, s) => total + Number(s.duration_minutes ?? 30),
      0
    ) || 30

  const override = ((overrideRows ?? []) as OverrideRow[])[0]

  if (override?.is_closed) {
    console.log('[getAvailableSlots]', { staffId, date, dayOfWeek, closed: true, reason: override.reason })
    return { slots: [], isWorkingDay: false, reason: override.reason ?? 'Chiuso' }
  }

  // Determine working windows (supports lunch-break splits via multiple rows)
  let workingWindows: Array<{ startTime: string; endTime: string }>

  if (override?.start_time && override.end_time) {
    workingWindows = [{ startTime: override.start_time, endTime: override.end_time }]
  } else {
    const { data: workingHoursRows } = await db
      .from('working_hours')
      .select('start_time, end_time')
      .eq('tenant_id', tenantId)
      .eq('staff_id', staffId)
      .eq('day_of_week', dayOfWeek)
      .order('start_time', { ascending: true })

    workingWindows = ((workingHoursRows ?? []) as WorkingHoursRow[]).map((row) => ({
      startTime: row.start_time,
      endTime: row.end_time,
    }))
  }

  if (workingWindows.length === 0) {
    console.log('[getAvailableSlots]', { staffId, date, dayOfWeek, noWorkingHours: true })
    return { slots: [], isWorkingDay: false, reason: 'Giorno di riposo' }
  }

  // Fetch existing appointments for this staff on this date
  const { data: appointmentRows } = await db
    .from('appointments')
    .select('start_time, end_time')
    .eq('tenant_id', tenantId)
    .eq('staff_id', staffId)
    .is('deleted_at', null)
    .gte('start_time', `${date}T00:00:00`)
    .lt('start_time', `${nextDate}T00:00:00`)
    .neq('status', 'cancelled')
    .neq('status', 'no_show')

  // Convert appointments to local-time minute ranges
  const busyWindows = ((appointmentRows ?? []) as AppointmentWindow[]).map((appt) => {
    const start = getTimeZoneParts(appt.start_time, timezone)
    const end = getTimeZoneParts(appt.end_time, timezone)
    return { start: start.minutes, end: end.minutes }
  })

  // For today, minimum slot start = now + 30min buffer
  const minSlotStart = date === now.date ? now.minutes + SLOT_STEP_MINUTES : 0

  // Generate slots across all working windows (handles lunch breaks)
  const allSlots: SlotItem[] = []
  for (const window of workingWindows) {
    const startMinutes = timeToMinutes(window.startTime)
    const endMinutes = timeToMinutes(window.endTime)

    for (
      let slotStart = startMinutes;
      slotStart + totalDuration <= endMinutes;
      slotStart += SLOT_STEP_MINUTES
    ) {
      if (slotStart < minSlotStart) continue

      const slotEnd = slotStart + totalDuration
      const hasConflict = busyWindows.some((busy) => slotStart < busy.end && slotEnd > busy.start)

      allSlots.push({ time: minutesToTime(slotStart), available: !hasConflict })
    }
  }

  console.log('[getAvailableSlots]', {
    staffId,
    date,
    dayOfWeek,
    workingWindowsCount: workingWindows.length,
    overrideFound: !!override,
    existingAppointments: busyWindows.length,
    slotsGenerated: allSlots.length,
    availableSlots: allSlots.filter((s) => s.available).length,
  })

  return { slots: allSlots, isWorkingDay: true }
}
