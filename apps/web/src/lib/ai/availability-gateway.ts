import type {
  AvailabilityGatewayFindInput,
  AvailabilityGatewayLookup,
  AvailabilityResult,
  AvailabilitySlot,
} from './draft-provider.ts'

export type {
  AvailabilityGatewayFindInput,
  AvailabilityGatewayLookup,
  AvailabilityResult,
  AvailabilitySlot,
} from './draft-provider.ts'

export interface AvailabilityGateway {
  gatewayId: string
  findAvailableSlots(
    input: AvailabilityGatewayFindInput,
  ): Promise<AvailabilityGatewayLookup>
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function sameSlot(
  left: AvailabilitySlot,
  right: AvailabilitySlot,
): boolean {
  return left.date === right.date
    && left.startTime === right.startTime
    && left.endTime === right.endTime
}

function dedupeSlots(slots: AvailabilitySlot[]): AvailabilitySlot[] {
  const deduped: AvailabilitySlot[] = []

  for (const slot of slots) {
    const existing = deduped.find((entry) => sameSlot(entry, slot))
    if (!existing) {
      deduped.push({
        ...slot,
        staffIds: [...slot.staffIds].sort(),
      })
      continue
    }

    existing.staffIds = [...new Set([...existing.staffIds, ...slot.staffIds])].sort()
  }

  return deduped.sort((left, right) => {
    if (left.date === right.date) {
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime)
    }

    return left.date.localeCompare(right.date)
  })
}

function pickRequestedSlot(
  slots: AvailabilitySlot[],
  preferredTime: string | null | undefined,
): AvailabilitySlot | null {
  if (!preferredTime) return null
  return slots.find((slot) => slot.startTime === preferredTime) ?? null
}

function pickSuggestedSlots(
  slots: AvailabilitySlot[],
  preferredTime: string | null | undefined,
  limit = 3,
): AvailabilitySlot[] {
  if (slots.length === 0) return []

  if (!preferredTime) {
    return slots.slice(0, limit)
  }

  const preferredMinutes = timeToMinutes(preferredTime)

  return [...slots]
    .sort((left, right) => {
      const leftDelta = Math.abs(timeToMinutes(left.startTime) - preferredMinutes)
      const rightDelta = Math.abs(timeToMinutes(right.startTime) - preferredMinutes)
      if (leftDelta !== rightDelta) return leftDelta - rightDelta
      return timeToMinutes(left.startTime) - timeToMinutes(right.startTime)
    })
    .slice(0, limit)
    .sort((left, right) => timeToMinutes(left.startTime) - timeToMinutes(right.startTime))
}

export function resolveAvailabilityResult(input: {
  lookup: AvailabilityGatewayLookup
  preferredTime?: string | null
}): AvailabilityResult {
  const slots = dedupeSlots(input.lookup.slots)
  const requestedSlot = pickRequestedSlot(slots, input.preferredTime)

  if (requestedSlot) {
    return {
      available: true,
      requestedSlot,
      suggestedSlots: [],
      reason: 'available',
    }
  }

  if (!input.lookup.serviceAvailable) {
    return {
      available: false,
      requestedSlot: null,
      suggestedSlots: [],
      reason: 'service_unavailable',
    }
  }

  if (
    input.preferredTime
    && input.lookup.preferredTimeWithinBusinessHours === false
  ) {
    return {
      available: false,
      requestedSlot: null,
      suggestedSlots: pickSuggestedSlots(slots, input.preferredTime),
      reason: 'business_closed',
    }
  }

  if (!input.lookup.businessOpen) {
    return {
      available: false,
      requestedSlot: null,
      suggestedSlots: pickSuggestedSlots(slots, input.preferredTime),
      reason: 'business_closed',
    }
  }

  return {
    available: false,
    requestedSlot: null,
    suggestedSlots: pickSuggestedSlots(slots, input.preferredTime),
    reason: 'slot_unavailable',
  }
}
