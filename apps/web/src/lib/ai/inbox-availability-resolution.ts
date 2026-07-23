import {
  resolveAvailabilityResult,
  type AvailabilityGateway,
  type AvailabilityResult,
} from './availability-gateway.ts'
import type {
  AiDraftMessage,
  AiDraftSource,
  PreparedInboxDraftRequest,
  ReceptionistConversationState,
} from './draft-provider.ts'

function getLatestCustomerMessage(messages: AiDraftMessage[]): AiDraftMessage | null {
  const customers = messages.filter((message) => message.author === 'customer')
  return customers.at(-1) ?? null
}

function buildLocalDateAnchor(createdAt: string, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(createdAt))

  const year = parts.find((entry) => entry.type === 'year')?.value ?? '0000'
  const month = parts.find((entry) => entry.type === 'month')?.value ?? '00'
  const day = parts.find((entry) => entry.type === 'day')?.value ?? '00'

  return `${year}-${month}-${day}`
}

function addDays(date: string, amount: number): string {
  const current = new Date(`${date}T12:00:00.000Z`)
  current.setUTCDate(current.getUTCDate() + amount)
  return current.toISOString().slice(0, 10)
}

function describeDateForDraft(
  requestedDate: string,
  referenceMessage: AiDraftMessage | null,
  timezone: string,
): string {
  if (!referenceMessage) return requestedDate

  const today = buildLocalDateAnchor(referenceMessage.createdAt, timezone)
  if (requestedDate === today) return 'oggi'
  if (requestedDate === addDays(today, 1)) return 'domani'
  return requestedDate
}

function formatTimeForDraft(time: string): string {
  return time.endsWith(':00') ? time.slice(0, 2) : time
}

function joinSuggestedTimes(slots: AvailabilityResult['suggestedSlots']): string {
  const times = slots.map((slot) => `le ${slot.startTime}`)
  if (times.length === 0) return ''
  if (times.length === 1) return times[0]
  if (times.length === 2) return `${times[0]} oppure ${times[1]}`
  return `${times[0]}, ${times[1]} oppure ${times[2]}`
}

function buildAvailabilitySources(
  request: PreparedInboxDraftRequest,
  serviceId: string,
): AiDraftSource[] {
  const sources: AiDraftSource[] = [
    {
      kind: 'tool_result',
      label: 'Availability gateway read-only',
      ref: 'tool_result:search_availability',
    },
  ]

  const serviceSource = request.sources.find((source) => source.ref === `service:${serviceId}`)
  if (serviceSource) {
    sources.push(serviceSource)
  }

  const workingHoursSources = request.sources
    .filter((source) => source.ref.startsWith('working_hours:'))
    .slice(0, 3)
  sources.push(...workingHoursSources)

  return sources
}

function resolveServiceId(
  request: PreparedInboxDraftRequest,
  receptionistState: ReceptionistConversationState,
): string | null {
  if (!receptionistState.service) return null

  return request.serviceCatalog.find((service) => service.name === receptionistState.service)?.id ?? null
}

export interface BookingAvailabilityCheck {
  checked: boolean
  gatewayId: string | null
  availabilityResult: AvailabilityResult | null
  supportingSources: AiDraftSource[]
  draftText: string | null
}

export async function resolveBookingAvailabilityCheck(input: {
  request: PreparedInboxDraftRequest
  receptionistState: ReceptionistConversationState
  availabilityGateway: AvailabilityGateway
}): Promise<BookingAvailabilityCheck> {
  const { request, receptionistState, availabilityGateway } = input

  if (
    receptionistState.activeGoal !== 'booking'
    || !receptionistState.service
    || !receptionistState.requestedDate
    || !receptionistState.requestedTime
  ) {
    return {
      checked: false,
      gatewayId: null,
      availabilityResult: null,
      supportingSources: [],
      draftText: null,
    }
  }

  const serviceId = resolveServiceId(request, receptionistState)
  if (!serviceId) {
    return {
      checked: true,
      gatewayId: availabilityGateway.gatewayId,
      availabilityResult: {
        available: false,
        requestedSlot: null,
        suggestedSlots: [],
        reason: 'service_unavailable',
      },
      supportingSources: [],
      draftText: 'Questo servizio non risulta disponibile per la prenotazione online. Verifico con il salone e ti confermo.',
    }
  }

  const lookup = await availabilityGateway.findAvailableSlots({
    tenantId: request.tenantId,
    serviceId,
    requestedDate: receptionistState.requestedDate,
    preferredTime: receptionistState.requestedTime,
  })

  const availabilityResult = resolveAvailabilityResult({
    lookup,
    preferredTime: receptionistState.requestedTime,
  })
  const referenceMessage = getLatestCustomerMessage(request.messages)
  const describedDate = describeDateForDraft(
    receptionistState.requestedDate,
    referenceMessage,
    request.tenantProfile.timezone,
  )
  const describedTime = formatTimeForDraft(receptionistState.requestedTime)
  const supportingSources = buildAvailabilitySources(request, serviceId)

  switch (availabilityResult.reason) {
    case 'available':
      return {
        checked: true,
        gatewayId: availabilityGateway.gatewayId,
        availabilityResult,
        supportingSources,
        draftText: `Perfetto, preparo la prenotazione per ${describedDate} alle ${describedTime}.`,
      }
    case 'business_closed': {
      const suggestions = joinSuggestedTimes(availabilityResult.suggestedSlots)
      return {
        checked: true,
        gatewayId: availabilityGateway.gatewayId,
        availabilityResult,
        supportingSources,
        draftText: suggestions.length > 0
          ? `A quell'ora siamo chiusi. Posso proporti ${suggestions}.`
          : `A quell'ora siamo chiusi. Se vuoi ti propongo un orario diverso negli orari di apertura.`,
      }
    }
    case 'service_unavailable':
      return {
        checked: true,
        gatewayId: availabilityGateway.gatewayId,
        availabilityResult,
        supportingSources,
        draftText: 'Questo servizio non risulta disponibile per la prenotazione online. Verifico con il salone e ti confermo.',
      }
    case 'slot_unavailable':
    default: {
      const suggestions = joinSuggestedTimes(availabilityResult.suggestedSlots)
      return {
        checked: true,
        gatewayId: availabilityGateway.gatewayId,
        availabilityResult,
        supportingSources,
        draftText: suggestions.length > 0
          ? `Alle ${describedTime} purtroppo non c'e disponibilita. Posso proporti ${suggestions}.`
          : `Alle ${describedTime} purtroppo non c'e disponibilita. Se vuoi controllo un altro orario.`,
      }
    }
  }
}
