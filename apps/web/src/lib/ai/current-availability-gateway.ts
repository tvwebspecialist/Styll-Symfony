import { createAdminClient } from '@/lib/supabase/admin'
import { getAvailableSlots } from '@/lib/actions/booking-slots'
import type {
  AvailabilityGateway,
  AvailabilityGatewayFindInput,
  AvailabilityGatewayLookup,
  AvailabilitySlot,
} from './availability-gateway.ts'

interface StaffServiceRow {
  staff_id: string
}

interface ActiveStaffRow {
  id: string
}

interface WorkingHoursRow {
  start_time: string
  end_time: string
}

interface OverrideRow {
  is_closed: boolean
  start_time: string | null
  end_time: string | null
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function getDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay()
}

function minutesToTime(value: number): string {
  const hours = String(Math.floor(value / 60)).padStart(2, '0')
  const minutes = String(value % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function addDuration(startTime: string, durationMinutes: number): string {
  return minutesToTime(timeToMinutes(startTime) + durationMinutes)
}

async function isPreferredTimeWithinBusinessHours(input: {
  db: ReturnType<typeof createAdminClient>
  tenantId: string
  staffId: string
  requestedDate: string
  preferredTime: string | null | undefined
  durationMinutes: number
}): Promise<boolean | null> {
  if (!input.preferredTime) {
    return null
  }

  const { data: overrideRows } = await input.db
    .from('working_hour_overrides')
    .select('is_closed, start_time, end_time')
    .eq('tenant_id', input.tenantId)
    .eq('staff_id', input.staffId)
    .eq('date', input.requestedDate)

  const override = ((overrideRows ?? []) as OverrideRow[])[0]
  if (override?.is_closed) {
    return false
  }

  let windows: Array<{ startTime: string; endTime: string }>
  if (override?.start_time && override.end_time) {
    windows = [{ startTime: override.start_time, endTime: override.end_time }]
  } else {
    const { data: workingHoursRows } = await input.db
      .from('working_hours')
      .select('start_time, end_time')
      .eq('tenant_id', input.tenantId)
      .eq('staff_id', input.staffId)
      .eq('day_of_week', getDayOfWeek(input.requestedDate))
      .order('start_time', { ascending: true })

    windows = ((workingHoursRows ?? []) as WorkingHoursRow[]).map((row) => ({
      startTime: row.start_time,
      endTime: row.end_time,
    }))
  }

  if (windows.length === 0) {
    return false
  }

  const preferredStart = timeToMinutes(input.preferredTime)
  const preferredEnd = preferredStart + input.durationMinutes

  return windows.some((window) => {
    const startMinutes = timeToMinutes(window.startTime)
    const endMinutes = timeToMinutes(window.endTime)
    return preferredStart >= startMinutes && preferredEnd <= endMinutes
  })
}

export const currentAvailabilityGateway: AvailabilityGateway = {
  gatewayId: 'current_booking_slots_gateway_v1',
  async findAvailableSlots(
    input: AvailabilityGatewayFindInput,
  ): Promise<AvailabilityGatewayLookup> {
    const db = createAdminClient()

    const [{ data: serviceRow }, { data: staffServiceRows }] = await Promise.all([
      db
        .from('services')
        .select('id, duration_minutes')
        .eq('tenant_id', input.tenantId)
        .eq('id', input.serviceId)
        .eq('is_active', true)
        .maybeSingle(),
      db
        .from('staff_services')
        .select('staff_id')
        .eq('tenant_id', input.tenantId)
        .eq('service_id', input.serviceId),
    ])

    if (!serviceRow) {
      return {
        serviceId: input.serviceId,
        requestedDate: input.requestedDate,
        timezone: 'Europe/Rome',
        serviceAvailable: false,
        businessOpen: false,
        preferredTimeWithinBusinessHours: null,
        slots: [],
      }
    }

    const linkedStaffIds = [...new Set(
      ((staffServiceRows ?? []) as StaffServiceRow[])
        .map((row) => row.staff_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    )]

    if (linkedStaffIds.length === 0) {
      return {
        serviceId: input.serviceId,
        requestedDate: input.requestedDate,
        timezone: 'Europe/Rome',
        serviceAvailable: false,
        businessOpen: false,
        preferredTimeWithinBusinessHours: null,
        slots: [],
      }
    }

    const { data: activeStaffRows } = await db
      .from('staff_members')
      .select('id')
      .eq('tenant_id', input.tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .in('id', linkedStaffIds)

    const activeStaffIds = ((activeStaffRows ?? []) as ActiveStaffRow[]).map((row) => row.id)
    if (activeStaffIds.length === 0) {
      return {
        serviceId: input.serviceId,
        requestedDate: input.requestedDate,
        timezone: 'Europe/Rome',
        serviceAvailable: false,
        businessOpen: false,
        preferredTimeWithinBusinessHours: null,
        slots: [],
      }
    }

    const { data: tenantRow } = await db
      .from('tenants')
      .select('timezone')
      .eq('id', input.tenantId)
      .maybeSingle()
    const timezone = tenantRow?.timezone ?? 'Europe/Rome'
    const durationMinutes = Number(serviceRow.duration_minutes ?? 30) || 30

    const staffSlotResults = await Promise.all(
      activeStaffIds.map(async (staffId) => ({
        staffId,
        result: await getAvailableSlots({
          tenantId: input.tenantId,
          staffId,
          serviceIds: [input.serviceId],
          date: input.requestedDate,
          timezone,
        }),
        preferredTimeWithinBusinessHours: await isPreferredTimeWithinBusinessHours({
          db,
          tenantId: input.tenantId,
          staffId,
          requestedDate: input.requestedDate,
          preferredTime: input.preferredTime,
          durationMinutes,
        }),
      })),
    )

    const slots: AvailabilitySlot[] = []
    let businessOpen = false
    let preferredTimeWithinBusinessHours: boolean | null = input.preferredTime ? false : null

    for (const { staffId, result, preferredTimeWithinBusinessHours: staffPreferredTime } of staffSlotResults) {
      businessOpen ||= result.isWorkingDay
      if (staffPreferredTime === true) {
        preferredTimeWithinBusinessHours = true
      }

      for (const slot of result.slots) {
        if (!slot.available) continue
        slots.push({
          date: input.requestedDate,
          startTime: slot.time,
          endTime: addDuration(slot.time, durationMinutes),
          staffIds: [staffId],
        })
      }
    }

    return {
      serviceId: input.serviceId,
      requestedDate: input.requestedDate,
      timezone,
      serviceAvailable: true,
      businessOpen,
      preferredTimeWithinBusinessHours,
      slots,
    }
  },
}
