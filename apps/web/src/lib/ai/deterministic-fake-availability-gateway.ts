import type {
  AvailabilityGateway,
  AvailabilityGatewayFindInput,
  AvailabilityGatewayLookup,
  AvailabilitySlot,
} from './availability-gateway.ts'

interface FakeAvailabilityWindow {
  startTime: string
  endTime: string
}

interface FakeAvailabilityOverride {
  closed?: boolean
  windows?: FakeAvailabilityWindow[]
}

interface FakeAvailabilityStaffFixture {
  id: string
  serviceIds: string[]
  weeklyHours: Record<number, FakeAvailabilityWindow[]>
  busyByDate: Record<string, Array<{ startTime: string; endTime: string }>>
  overridesByDate?: Record<string, FakeAvailabilityOverride>
}

interface FakeAvailabilityTenantFixture {
  timezone: string
  serviceDurations: Record<string, number>
  staff: FakeAvailabilityStaffFixture[]
}

const SLOT_STEP_MINUTES = 30

const TENANT_FIXTURES: Record<string, FakeAvailabilityTenantFixture> = {
  'tenant-a': {
    timezone: 'Europe/Rome',
    serviceDurations: {
      'service-1': 30,
      'service-2': 20,
    },
    staff: [
      {
        id: 'staff-1',
        serviceIds: ['service-1', 'service-2'],
        weeklyHours: {
          1: [{ startTime: '09:00', endTime: '18:00' }],
          2: [{ startTime: '09:00', endTime: '18:00' }],
          3: [{ startTime: '09:00', endTime: '18:00' }],
          4: [{ startTime: '09:00', endTime: '18:00' }],
          5: [{ startTime: '09:00', endTime: '18:00' }],
          6: [{ startTime: '09:00', endTime: '14:00' }],
        },
        busyByDate: {
          '2026-07-21': [
            { startTime: '10:30', endTime: '15:30' },
            { startTime: '16:00', endTime: '16:30' },
            { startTime: '17:30', endTime: '18:00' },
          ],
          '2026-07-22': [
            { startTime: '09:30', endTime: '10:30' },
            { startTime: '15:00', endTime: '16:00' },
          ],
          '2026-08-15': [],
        },
        overridesByDate: {
          '2026-08-15': {
            closed: true,
          },
        },
      },
      {
        id: 'staff-2',
        serviceIds: ['service-1'],
        weeklyHours: {
          2: [{ startTime: '10:00', endTime: '18:00' }],
          3: [{ startTime: '10:00', endTime: '18:00' }],
          4: [{ startTime: '10:00', endTime: '18:00' }],
          5: [{ startTime: '10:00', endTime: '18:00' }],
        },
        busyByDate: {
          '2026-07-21': [
            { startTime: '11:00', endTime: '15:30' },
          ],
          '2026-07-22': [
            { startTime: '10:00', endTime: '11:30' },
            { startTime: '12:30', endTime: '13:30' },
          ],
        },
      },
    ],
  },
  'barber-house': {
    timezone: 'Europe/Rome',
    serviceDurations: {
      'service-1': 30,
      'service-2': 20,
    },
    staff: [
      {
        id: 'staff-1',
        serviceIds: ['service-1', 'service-2'],
        weeklyHours: {
          1: [
            { startTime: '09:00', endTime: '13:00' },
            { startTime: '14:00', endTime: '18:00' },
          ],
          2: [{ startTime: '09:00', endTime: '18:00' }],
          3: [{ startTime: '09:00', endTime: '18:00' }],
          4: [{ startTime: '09:00', endTime: '18:00' }],
          5: [{ startTime: '09:00', endTime: '18:00' }],
          6: [{ startTime: '09:00', endTime: '14:00' }],
        },
        busyByDate: {
          '2026-07-21': [
            { startTime: '10:30', endTime: '15:30' },
            { startTime: '16:00', endTime: '16:30' },
            { startTime: '17:30', endTime: '18:00' },
          ],
        },
      },
    ],
  },
  'studio-glow': {
    timezone: 'Europe/Rome',
    serviceDurations: {
      'service-1': 35,
      'service-2': 90,
    },
    staff: [
      {
        id: 'staff-1',
        serviceIds: ['service-1', 'service-2'],
        weeklyHours: {
          2: [{ startTime: '10:00', endTime: '19:00' }],
          3: [{ startTime: '10:00', endTime: '19:00' }],
          4: [{ startTime: '10:00', endTime: '20:00' }],
          5: [{ startTime: '10:00', endTime: '20:00' }],
          6: [{ startTime: '09:00', endTime: '15:00' }],
        },
        busyByDate: {
          '2026-07-21': [
            { startTime: '11:00', endTime: '12:30' },
            { startTime: '14:00', endTime: '15:30' },
          ],
        },
      },
    ],
  },
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function minutesToTime(value: number): string {
  const hours = String(Math.floor(value / 60)).padStart(2, '0')
  const minutes = String(value % 60).padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDayOfWeek(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay()
}

function resolveStaffWindows(
  staff: FakeAvailabilityStaffFixture,
  requestedDate: string,
): FakeAvailabilityWindow[] {
  const override = staff.overridesByDate?.[requestedDate]
  if (override?.closed) {
    return []
  }

  return override?.windows
    ?? staff.weeklyHours[getDayOfWeek(requestedDate)]
    ?? []
}

function isPreferredTimeWithinWindows(input: {
  staff: FakeAvailabilityStaffFixture
  requestedDate: string
  preferredTime: string | null | undefined
  durationMinutes: number
}): boolean | null {
  if (!input.preferredTime) {
    return null
  }

  const windows = resolveStaffWindows(input.staff, input.requestedDate)
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

function buildSlotsForStaff(input: {
  staff: FakeAvailabilityStaffFixture
  requestedDate: string
  durationMinutes: number
}): {
  businessOpen: boolean
  slots: AvailabilitySlot[]
} {
  const windows = resolveStaffWindows(input.staff, input.requestedDate)
  if (windows.length === 0) {
    return { businessOpen: false, slots: [] }
  }

  const busyWindows = (input.staff.busyByDate[input.requestedDate] ?? []).map((entry) => ({
    start: timeToMinutes(entry.startTime),
    end: timeToMinutes(entry.endTime),
  }))

  const slots: AvailabilitySlot[] = []
  for (const window of windows) {
    const startMinutes = timeToMinutes(window.startTime)
    const endMinutes = timeToMinutes(window.endTime)

    for (
      let slotStart = startMinutes;
      slotStart + input.durationMinutes <= endMinutes;
      slotStart += SLOT_STEP_MINUTES
    ) {
      const slotEnd = slotStart + input.durationMinutes
      const hasConflict = busyWindows.some((busy) => slotStart < busy.end && slotEnd > busy.start)
      if (hasConflict) continue

      slots.push({
        date: input.requestedDate,
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
        staffIds: [input.staff.id],
      })
    }
  }

  return {
    businessOpen: true,
    slots,
  }
}

function resolveFixture(
  tenantId: string,
): FakeAvailabilityTenantFixture {
  return TENANT_FIXTURES[tenantId] ?? TENANT_FIXTURES['tenant-a']
}

export function createDeterministicFakeAvailabilityGateway(
  fixtures: Record<string, FakeAvailabilityTenantFixture> = TENANT_FIXTURES,
): AvailabilityGateway {
  return {
    gatewayId: 'deterministic_fake_availability_v1',
    async findAvailableSlots(
      input: AvailabilityGatewayFindInput,
    ): Promise<AvailabilityGatewayLookup> {
      const fixture = fixtures[input.tenantId] ?? resolveFixture(input.tenantId)
      const durationMinutes = fixture.serviceDurations[input.serviceId]
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        return {
          serviceId: input.serviceId,
          requestedDate: input.requestedDate,
          timezone: fixture.timezone,
          serviceAvailable: false,
          businessOpen: false,
          preferredTimeWithinBusinessHours: null,
          slots: [],
        }
      }

      const eligibleStaff = fixture.staff.filter((staff) => staff.serviceIds.includes(input.serviceId))
      if (eligibleStaff.length === 0) {
        return {
          serviceId: input.serviceId,
          requestedDate: input.requestedDate,
          timezone: fixture.timezone,
          serviceAvailable: false,
          businessOpen: false,
          preferredTimeWithinBusinessHours: null,
          slots: [],
        }
      }

      const aggregatedSlots: AvailabilitySlot[] = []
      let businessOpen = false
      let preferredTimeWithinBusinessHours: boolean | null = input.preferredTime ? false : null

      for (const staff of eligibleStaff) {
        const result = buildSlotsForStaff({
          staff,
          requestedDate: input.requestedDate,
          durationMinutes,
        })
        businessOpen ||= result.businessOpen
        aggregatedSlots.push(...result.slots)
        if (
          input.preferredTime
          && isPreferredTimeWithinWindows({
            staff,
            requestedDate: input.requestedDate,
            preferredTime: input.preferredTime,
            durationMinutes,
          })
        ) {
          preferredTimeWithinBusinessHours = true
        }
      }

      return {
        serviceId: input.serviceId,
        requestedDate: input.requestedDate,
        timezone: fixture.timezone,
        serviceAvailable: true,
        businessOpen,
        preferredTimeWithinBusinessHours,
        slots: aggregatedSlots,
      }
    },
  }
}

export const deterministicFakeAvailabilityGateway = createDeterministicFakeAvailabilityGateway()
