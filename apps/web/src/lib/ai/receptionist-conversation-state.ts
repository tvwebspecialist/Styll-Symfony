import type {
  AvailabilityResult,
  AiConversationUnderstanding,
  AiDraftMessage,
  AppointmentPreparedToolCall,
  InboxConversationMemory,
  PreparedInboxDraftRequest,
  ReceptionistConversationGoal,
  ReceptionistConversationState,
  ReceptionistConversationStateField,
} from './draft-provider.ts'
import {
  extractCurrentAppointmentReference,
  findDateCandidates,
  findPreferredWindow,
  findTimeCandidates,
  normalizeForSearch,
  resolveServiceMention,
} from './inbox-memory-resolver.ts'

interface ResolveReceptionistConversationStateInput {
  messages: AiDraftMessage[]
  serviceCatalog: PreparedInboxDraftRequest['serviceCatalog']
  timezone: string
  conversationMemory: InboxConversationMemory
  understanding?: AiConversationUnderstanding | null
}

interface MutableReceptionistConversationState {
  activeGoal: ReceptionistConversationGoal
  service: string | null
  requestedDate: string | null
  requestedTime: string | null
  appointmentReference: string | null
  customerName: string | null
  customerNotes: string | null
  missingFields: ReceptionistConversationStateField[]
  nextQuestion: string | null
  lastIntent: ReceptionistConversationState['lastIntent']
  updatedFromMessageId: string | null
}

const NORMALIZED_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NORMALIZED_TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/
const NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80}$/
const CORRECTION_PATTERN = /\b(anzi|invece|cambio|cambiamo|correggo|rettifico|no[, ]|non quello|piuttosto)\b/i
const SLOT_SELECTION_CONFIRMATION_PATTERN = /^(si|s|ok|va bene|perfetto|d accordo|ci sta)(?:\s+quella)?[!.\s]*$/i

const ITALIAN_WORD_HOUR_MAP: Record<string, number> = {
  una: 1,
  uno: 1,
  due: 2,
  tre: 3,
  quattro: 4,
  cinque: 5,
  sei: 6,
  sette: 7,
  otto: 8,
  nove: 9,
  dieci: 10,
  undici: 11,
  dodici: 12,
  tredici: 13,
  quattordici: 14,
  quindici: 15,
  sedici: 16,
  diciassette: 17,
  diciotto: 18,
  diciannove: 19,
  venti: 20,
  ventuno: 21,
  ventidue: 22,
  ventitre: 23,
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function sortMessages(messages: AiDraftMessage[]): AiDraftMessage[] {
  return [...messages].sort((left, right) => {
    if (left.createdAt === right.createdAt) {
      return left.id.localeCompare(right.id)
    }

    return left.createdAt.localeCompare(right.createdAt)
  })
}

function findLatestCustomerMessage(messages: AiDraftMessage[]): AiDraftMessage | null {
  const customers = sortMessages(messages).filter((message) => message.author === 'customer')
  return customers.at(-1) ?? null
}

function findLatestAssistantSuggestedSlots(messages: AiDraftMessage[]): string[] {
  const sortedMessages = sortMessages(messages)
  const latestCustomerIndex = [...sortedMessages]
    .map((message, index) => ({ message, index }))
    .filter((entry) => entry.message.author === 'customer')
    .at(-1)?.index

  if (latestCustomerIndex == null || latestCustomerIndex <= 0) {
    return []
  }

  for (let index = latestCustomerIndex - 1; index >= 0; index -= 1) {
    const candidate = sortedMessages[index]
    if (candidate.author !== 'assistant') continue

    const suggestionText = candidate.text.match(
      /(?:proporti|proporre|propongo|tra questi orari|questi orari)(.*)$/i,
    )?.[1] ?? candidate.text

    const slots = [
      ...suggestionText.matchAll(/\b((?:[01]?\d|2[0-3]):[0-5]\d)\b/g),
    ]
      .map((match) => match[1]?.padStart(5, '0'))
      .filter((value): value is string => typeof value === 'string')
      .filter((value, slotIndex, values) => values.indexOf(value) === slotIndex)

    if (slots.length > 0) {
      return slots.slice(0, 3)
    }
  }

  return []
}

function resolveSuggestedSlotSelection(input: {
  latestCustomerMessage: AiDraftMessage | null
  suggestedSlots: string[]
}): string | null {
  if (!input.latestCustomerMessage || input.suggestedSlots.length === 0) {
    return null
  }

  const directTimeCandidates = findTimeCandidates(
    input.latestCustomerMessage.text,
    input.latestCustomerMessage.id,
  ).map((entry) => entry.value.normalizedTime)
  const explicitSuggestedTimes = [
    ...input.latestCustomerMessage.text.matchAll(/\b((?:[01]?\d|2[0-3]):[0-5]\d)\b/g),
  ]
    .map((match) => match[1]?.padStart(5, '0'))
    .filter((value): value is string => typeof value === 'string')
  const directMatch = directTimeCandidates.find((time) => input.suggestedSlots.includes(time))
    ?? explicitSuggestedTimes.find((time) => input.suggestedSlots.includes(time))
  if (directMatch) {
    return directMatch
  }

  const normalized = normalizeForSearch(input.latestCustomerMessage.text)

  if (/\b(prima|primo)\b/.test(normalized)) {
    return input.suggestedSlots[0] ?? null
  }

  if (/\b(seconda|secondo)\b/.test(normalized)) {
    return input.suggestedSlots[1] ?? null
  }

  if (/\b(terza|terzo)\b/.test(normalized)) {
    return input.suggestedSlots[2] ?? null
  }

  if (/\b(ultima|ultimo)\b/.test(normalized)) {
    return input.suggestedSlots.at(-1) ?? null
  }

  if (SLOT_SELECTION_CONFIRMATION_PATTERN.test(input.latestCustomerMessage.text.trim())) {
    return input.suggestedSlots.length === 1
      ? input.suggestedSlots[0] ?? null
      : null
  }

  return null
}

function sanitizeNullableText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') return null
  const normalized = normalizeWhitespace(value)
  if (normalized.length === 0) return null
  return clipText(normalized, maxLength)
}

function normalizeConversationGoal(
  goal: ReceptionistConversationGoal,
): ReceptionistConversationGoal {
  return goal === 'booking' || goal === 'reschedule' || goal === 'cancel'
    ? goal
    : null
}

function buildMissingFields(
  state: Pick<
    MutableReceptionistConversationState,
    'activeGoal' | 'service' | 'requestedDate' | 'requestedTime' | 'appointmentReference'
  >,
): ReceptionistConversationStateField[] {
  switch (state.activeGoal) {
    case 'booking': {
      const missing: ReceptionistConversationStateField[] = []
      if (!state.service) missing.push('service')
      if (!state.requestedDate) missing.push('requestedDate')
      if (!state.requestedTime) missing.push('requestedTime')
      return missing
    }
    case 'reschedule': {
      const missing: ReceptionistConversationStateField[] = []
      if (!state.appointmentReference) missing.push('appointmentReference')
      if (!state.requestedDate) missing.push('requestedDate')
      if (!state.requestedTime) missing.push('requestedTime')
      return missing
    }
    case 'cancel':
      return state.appointmentReference ? [] : ['appointmentReference']
    default:
      return []
  }
}

function buildNextQuestion(
  state: Pick<MutableReceptionistConversationState, 'activeGoal'>,
  missingField: ReceptionistConversationStateField | undefined,
  preferredWindow: string | null,
): string | null {
  switch (missingField) {
    case 'service':
      return 'Che servizio desideri?'
    case 'requestedDate':
      return state.activeGoal === 'reschedule'
        ? 'Per quale giorno vuoi spostarlo?'
        : 'Per quale giorno preferisci?'
    case 'requestedTime':
      if (state.activeGoal === 'reschedule') {
        return 'A che ora vuoi spostarlo?'
      }
      return preferredWindow
        ? `Perfetto. Nel ${preferredWindow} a che ora preferisci?`
        : 'A che ora preferisci?'
    case 'appointmentReference':
      return state.activeGoal === 'cancel'
        ? 'Quale appuntamento vuoi cancellare?'
        : 'Quale appuntamento vuoi spostare?'
    default:
      return null
  }
}

function buildBaseCustomerNotes(
  messages: AiDraftMessage[],
  state: Pick<MutableReceptionistConversationState, 'activeGoal'>,
): string | null {
  if (!state.activeGoal) return null

  const notes = sortMessages(messages)
    .filter((message) => message.author === 'customer')
    .map((message) => normalizeWhitespace(message.text))
    .filter(Boolean)
    .slice(-6)
    .filter((value, index, values) => values.indexOf(value) === index)

  if (notes.length === 0) return null
  return clipText(notes.join(' | '), 320)
}

function buildBaseState(
  input: ResolveReceptionistConversationStateInput,
): MutableReceptionistConversationState {
  const activeGoal = normalizeConversationGoal(input.conversationMemory.activeIntent)
  const latestCustomerMessage = findLatestCustomerMessage(input.messages)
  const preferredWindow = input.conversationMemory.planner?.preferredWindow
    ?? latestCustomerMessage?.text
    ?? null

  const mutableState: MutableReceptionistConversationState = {
    activeGoal,
    service: input.conversationMemory.lastService?.name ?? null,
    requestedDate: input.conversationMemory.lastDate?.isoDate ?? null,
    requestedTime: input.conversationMemory.lastTime?.normalizedTime ?? null,
    appointmentReference: input.conversationMemory.lastAppointmentReference ?? null,
    customerName: null,
    customerNotes: null,
    missingFields: [],
    nextQuestion: null,
    lastIntent: input.conversationMemory.latestIntent,
    updatedFromMessageId: latestCustomerMessage?.id ?? null,
  }

  if (activeGoal === 'reschedule' && latestCustomerMessage) {
    const dateCandidates = findDateCandidates(
      latestCustomerMessage.text,
      latestCustomerMessage.id,
      latestCustomerMessage.createdAt,
      input.timezone,
    )
    const timeCandidates = findTimeCandidates(
      latestCustomerMessage.text,
      latestCustomerMessage.id,
    )
    const reference = extractCurrentAppointmentReference(latestCustomerMessage.text)

    if (reference) {
      mutableState.appointmentReference = reference
    }

    if (dateCandidates.length >= 2) {
      mutableState.requestedDate = dateCandidates.at(-1)?.value.isoDate ?? mutableState.requestedDate
    }

    if (timeCandidates.length >= 2) {
      mutableState.requestedTime = timeCandidates.at(-1)?.value.normalizedTime ?? mutableState.requestedTime
    } else if (reference && dateCandidates.length >= 2) {
      mutableState.requestedTime = null
    }
  }

  if (activeGoal === 'booking' && latestCustomerMessage) {
    const selectedSuggestedSlot = resolveSuggestedSlotSelection({
      latestCustomerMessage,
      suggestedSlots: findLatestAssistantSuggestedSlots(input.messages),
    })

    if (selectedSuggestedSlot) {
      mutableState.requestedTime = selectedSuggestedSlot
      mutableState.updatedFromMessageId = latestCustomerMessage.id
    }
  }

  mutableState.customerNotes = buildBaseCustomerNotes(input.messages, mutableState)
  mutableState.missingFields = buildMissingFields(mutableState)
  mutableState.nextQuestion = buildNextQuestion(
    mutableState,
    mutableState.missingFields[0],
    typeof preferredWindow === 'string' ? findPreferredWindow(preferredWindow) : null,
  )

  return mutableState
}

function isNormalizedDate(value: string | null | undefined): value is string {
  if (typeof value !== 'string' || !NORMALIZED_DATE_PATTERN.test(value)) {
    return false
  }

  const parsed = new Date(`${value}T12:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function isNormalizedTime(value: string | null | undefined): value is string {
  return typeof value === 'string' && NORMALIZED_TIME_PATTERN.test(value)
}

function hasDateHint(text: string, messageId: string, createdAt: string, timezone: string): boolean {
  if (findDateCandidates(text, messageId, createdAt, timezone).length > 0) {
    return true
  }

  const normalized = normalizeForSearch(text)
  return /\b(oggi|domani|dopodomani|lun|mar|mer|gio|ven|sab|dom|\d{1,2}[\/.-]\d{1,2})\b/.test(normalized)
}

function readWordTimeCandidates(
  text: string,
  options?: {
    assumePmForAmbiguousHours?: boolean
  },
): string[] {
  const normalized = normalizeForSearch(text)
  const matches = normalized.matchAll(
    /\b(?:alle|per le|verso le|ore)\s+(una|uno|due|tre|quattro|cinque|sei|sette|otto|nove|dieci|undici|dodici|tredici|quattordici|quindici|sedici|diciassette|diciotto|diciannove|venti|ventuno|ventidue|ventitre)(?:\s+e\s+mezza)?\b/g,
  )
  const results: string[] = []
  const normalizedText = normalizeForSearch(text)
  const prefersMorning = /\b(mattina|stamattina|am)\b/.test(normalizedText)
  const prefersEvening = /\b(pomeriggio|sera|stasera|pm)\b/.test(normalizedText)

  for (const match of matches) {
    const hourWord = match[1]
    const baseHour = ITALIAN_WORD_HOUR_MAP[hourWord]
    if (!Number.isInteger(baseHour)) continue

    let hour = baseHour
    if (prefersEvening && hour < 12) {
      hour += 12
    } else if (
      !prefersMorning
      && options?.assumePmForAmbiguousHours
      && hour >= 1
      && hour <= 7
    ) {
      hour += 12
    }

    const minutes = /\be\s+mezza\b/.test(match[0]) ? '30' : '00'
    results.push(`${String(hour).padStart(2, '0')}:${minutes}`)
  }

  return results
}

function hasTimeHint(text: string, messageId: string): boolean {
  return findTimeCandidates(text, messageId).length > 0 || readWordTimeCandidates(text).length > 0
}

function hasAppointmentHint(text: string): boolean {
  return /\b(appuntament|prenotaz)\w*/i.test(text)
}

function hasNameHint(text: string): boolean {
  return /\b(mi chiamo|sono)\b/i.test(text)
}

function looksLikeCorrection(text: string): boolean {
  return CORRECTION_PATTERN.test(text)
}

function validateService(
  service: string | null,
  input: ResolveReceptionistConversationStateInput,
  messageId: string,
): string | null {
  const candidate = sanitizeNullableText(service, 120)
  if (!candidate) return null
  return resolveServiceMention(candidate, messageId, input.serviceCatalog)?.name ?? null
}

function validateRequestedDate(
  requestedDate: string | null,
  input: ResolveReceptionistConversationStateInput,
  latestCustomerMessage: AiDraftMessage | null,
): string | null {
  if (!latestCustomerMessage || !isNormalizedDate(requestedDate)) {
    return null
  }

  const deterministicMatch = findDateCandidates(
    latestCustomerMessage.text,
    latestCustomerMessage.id,
    latestCustomerMessage.createdAt,
    input.timezone,
  ).some((candidate) => candidate.value.isoDate === requestedDate)

  if (deterministicMatch) {
    return requestedDate
  }

  return hasDateHint(
    latestCustomerMessage.text,
    latestCustomerMessage.id,
    latestCustomerMessage.createdAt,
    input.timezone,
  )
    ? requestedDate
    : null
}

function validateRequestedTime(
  requestedTime: string | null,
  latestCustomerMessage: AiDraftMessage | null,
): string | null {
  if (!latestCustomerMessage || !isNormalizedTime(requestedTime)) {
    return null
  }

  const deterministicMatch = findTimeCandidates(
    latestCustomerMessage.text,
    latestCustomerMessage.id,
  ).some((candidate) => candidate.value.normalizedTime === requestedTime)

  if (deterministicMatch) {
    return requestedTime
  }

  return hasTimeHint(latestCustomerMessage.text, latestCustomerMessage.id)
    ? requestedTime
    : null
}

function validateAppointmentReference(
  reference: string | null,
  latestCustomerMessage: AiDraftMessage | null,
): string | null {
  if (!latestCustomerMessage) return null
  const candidate = sanitizeNullableText(reference, 120)
  if (!candidate) return null

  const deterministicReference = extractCurrentAppointmentReference(latestCustomerMessage.text)
  if (deterministicReference && normalizeForSearch(deterministicReference) === normalizeForSearch(candidate)) {
    return deterministicReference
  }

  return hasAppointmentHint(latestCustomerMessage.text) ? candidate : null
}

function validateCustomerName(
  customerName: string | null,
  latestCustomerMessage: AiDraftMessage | null,
): string | null {
  const candidate = sanitizeNullableText(customerName, 80)
  if (!candidate || !NAME_PATTERN.test(candidate)) {
    return null
  }

  if (!latestCustomerMessage) return candidate
  return hasNameHint(latestCustomerMessage.text) ? candidate : null
}

function validateCustomerNotes(customerNotes: string | null): string | null {
  return sanitizeNullableText(customerNotes, 220)
}

function shouldApplyField(input: {
  currentValue: string | null
  nextValue: string | null
  correction: boolean
  explicitHint: boolean
  correctionText: boolean
}): boolean {
  if (!input.nextValue) return false
  if (!input.currentValue) return true
  if (input.correction) return true
  if (input.correctionText) return true
  if (input.explicitHint && input.currentValue !== input.nextValue) return true
  return false
}

function finalizeState(
  state: MutableReceptionistConversationState,
  preferredWindow: string | null,
): ReceptionistConversationState {
  const missingFields = buildMissingFields(state)

  return {
    activeGoal: state.activeGoal,
    service: state.service,
    requestedDate: state.requestedDate,
    requestedTime: state.requestedTime,
    appointmentReference: state.appointmentReference,
    customerName: state.customerName,
    customerNotes: state.customerNotes,
    missingFields,
    nextQuestion: buildNextQuestion(state, missingFields[0], preferredWindow),
    lastIntent: state.lastIntent,
    updatedFromMessageId: state.updatedFromMessageId,
  }
}

function applyUnderstanding(
  baseState: MutableReceptionistConversationState,
  input: ResolveReceptionistConversationStateInput,
): ReceptionistConversationState {
  const understanding = input.understanding
  if (!understanding) {
    return finalizeState(
      baseState,
      input.conversationMemory.planner?.preferredWindow ?? null,
    )
  }

  const latestCustomerMessage = findLatestCustomerMessage(input.messages)
  const latestText = latestCustomerMessage?.text ?? ''
  const correctionText = looksLikeCorrection(latestText)

  if (understanding.intent === 'booking' || understanding.intent === 'reschedule' || understanding.intent === 'cancel') {
    baseState.activeGoal = understanding.intent
  } else if (understanding.intent === 'conversational_followup' && baseState.activeGoal) {
    baseState.activeGoal = baseState.activeGoal
  }

  baseState.lastIntent = understanding.intent

  const service = validateService(
    understanding.entities.service,
    input,
    latestCustomerMessage?.id ?? 'provider',
  )
  if (shouldApplyField({
    currentValue: baseState.service,
    nextValue: service,
    correction: understanding.corrections.replacesService,
    explicitHint: service !== null,
    correctionText,
  })) {
    baseState.service = service
    baseState.updatedFromMessageId = latestCustomerMessage?.id ?? baseState.updatedFromMessageId
  }

  const requestedDate = validateRequestedDate(
    understanding.entities.requestedDate,
    input,
    latestCustomerMessage,
  )
  if (shouldApplyField({
    currentValue: baseState.requestedDate,
    nextValue: requestedDate,
    correction: understanding.corrections.replacesDate,
    explicitHint:
      latestCustomerMessage !== null
      && hasDateHint(
        latestCustomerMessage.text,
        latestCustomerMessage.id,
        latestCustomerMessage.createdAt,
        input.timezone,
      ),
    correctionText,
  })) {
    baseState.requestedDate = requestedDate
    baseState.updatedFromMessageId = latestCustomerMessage?.id ?? baseState.updatedFromMessageId
  }

  const requestedTime = validateRequestedTime(
    understanding.entities.requestedTime,
    latestCustomerMessage,
  )
  if (shouldApplyField({
    currentValue: baseState.requestedTime,
    nextValue: requestedTime,
    correction: understanding.corrections.replacesTime,
    explicitHint: latestCustomerMessage !== null && hasTimeHint(latestCustomerMessage.text, latestCustomerMessage.id),
    correctionText,
  })) {
    baseState.requestedTime = requestedTime
    baseState.updatedFromMessageId = latestCustomerMessage?.id ?? baseState.updatedFromMessageId
  }

  const appointmentReference = validateAppointmentReference(
    understanding.entities.appointmentReference,
    latestCustomerMessage,
  )
  if (shouldApplyField({
    currentValue: baseState.appointmentReference,
    nextValue: appointmentReference,
    correction: false,
    explicitHint: latestCustomerMessage !== null && hasAppointmentHint(latestCustomerMessage.text),
    correctionText,
  })) {
    baseState.appointmentReference = appointmentReference
    baseState.updatedFromMessageId = latestCustomerMessage?.id ?? baseState.updatedFromMessageId
  }

  const customerName = validateCustomerName(
    understanding.entities.customerName,
    latestCustomerMessage,
  )
  if (customerName && (!baseState.customerName || correctionText)) {
    baseState.customerName = customerName
    baseState.updatedFromMessageId = latestCustomerMessage?.id ?? baseState.updatedFromMessageId
  }

  const customerNotes = validateCustomerNotes(understanding.entities.customerNotes)
  if (customerNotes) {
    baseState.customerNotes = baseState.customerNotes
      ? clipText(`${baseState.customerNotes} | ${customerNotes}`, 320)
      : customerNotes
  }

  if (!baseState.customerNotes) {
    baseState.customerNotes = buildBaseCustomerNotes(input.messages, baseState)
  }

  return finalizeState(
    baseState,
    input.conversationMemory.planner?.preferredWindow ?? findPreferredWindow(latestText),
  )
}

export function resolveDeterministicReceptionistConversationState(
  input: Omit<ResolveReceptionistConversationStateInput, 'understanding'>,
): ReceptionistConversationState {
  return finalizeState(
    buildBaseState(input),
    input.conversationMemory.planner?.preferredWindow ?? null,
  )
}

export function resolveReceptionistConversationState(
  input: ResolveReceptionistConversationStateInput,
): ReceptionistConversationState {
  const baseState = buildBaseState(input)
  return applyUnderstanding(baseState, input)
}

export function buildReceptionistConversationSummary(
  state: ReceptionistConversationState,
): string {
  const parts: string[] = []

  switch (state.activeGoal) {
    case 'booking':
      parts.push('Richiesta di prenotazione')
      break
    case 'reschedule':
      parts.push('Richiesta di spostamento appuntamento')
      break
    case 'cancel':
      parts.push('Richiesta di cancellazione appuntamento')
      break
    default:
      parts.push('Conversazione receptionist')
  }

  if (state.service) {
    parts.push(`servizio ${state.service}`)
  }
  if (state.appointmentReference) {
    parts.push(`riferimento ${state.appointmentReference}`)
  }
  if (state.requestedDate) {
    parts.push(`giorno ${state.requestedDate}`)
  }
  if (state.requestedTime) {
    parts.push(`orario ${state.requestedTime}`)
  }
  if (state.customerName) {
    parts.push(`cliente ${state.customerName}`)
  }

  return clipText(parts.join(', '), 220)
}

export function buildReceptionistPreparedToolCall(
  state: ReceptionistConversationState,
  options?: {
    availabilityResult?: AvailabilityResult | null
  },
): AppointmentPreparedToolCall | null {
  const customer_notes = state.customerNotes ?? ''
  const conversation_summary = buildReceptionistConversationSummary(state)

  if (state.activeGoal === 'booking') {
    if (
      !state.service
      || !state.requestedDate
      || !state.requestedTime
      || options?.availabilityResult?.available !== true
      || !options.availabilityResult.requestedSlot
    ) {
      return null
    }

    return {
      name: 'prepare_booking_sandbox',
      arguments: {
        service: state.service,
        requested_date: state.requestedDate,
        requested_time: state.requestedTime,
        selected_slot: options.availabilityResult.requestedSlot.startTime,
        customer_name: state.customerName,
        customer_notes,
        conversation_summary,
      },
    }
  }

  if (state.activeGoal === 'reschedule') {
    if (!state.appointmentReference || !state.requestedDate || !state.requestedTime) {
      return null
    }

    return {
      name: 'prepare_reschedule',
      arguments: {
        current_appointment_reference: state.appointmentReference,
        requested_date: state.requestedDate,
        requested_time: state.requestedTime,
        customer_name: state.customerName,
        customer_notes,
        conversation_summary,
      },
    }
  }

  if (state.activeGoal === 'cancel') {
    if (!state.appointmentReference) {
      return null
    }

    return {
      name: 'prepare_cancellation',
      arguments: {
        current_appointment_reference: state.appointmentReference,
        customer_name: state.customerName,
        customer_notes,
        conversation_summary,
      },
    }
  }

  return null
}

export function inferWordBasedTimeForConversation(input: {
  text: string
  activeGoal: ReceptionistConversationGoal
}): string | null {
  const candidates = readWordTimeCandidates(input.text, {
    assumePmForAmbiguousHours: input.activeGoal !== null,
  })
  return candidates[0] ?? null
}
