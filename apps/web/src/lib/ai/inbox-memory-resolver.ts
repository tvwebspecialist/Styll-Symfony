import type {
  AiDraftIntent,
  AiDraftMessage,
  AppointmentPreparationField,
  AppointmentPreparedToolCall,
  AppointmentResolvedDate,
  AppointmentResolvedService,
  AppointmentResolvedTime,
  InboxConversationMemory,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'

type ActiveAppointmentIntent = 'booking' | 'reschedule' | 'cancel'

interface ResolveInboxConversationMemoryInput {
  messages: AiDraftMessage[]
  serviceCatalog: PreparedInboxDraftRequest['serviceCatalog']
  timezone: string
}

interface InternalAppointmentState {
  activeIntent: ActiveAppointmentIntent | null
  latestIntent: AiDraftIntent
  lastService: AppointmentResolvedService | null
  lastDate: AppointmentResolvedDate | null
  lastTime: AppointmentResolvedTime | null
  currentAppointmentReference: string | null
  preferredWindow: string | null
  relevantCustomerTexts: string[]
}

interface IndexedValue<T> {
  index: number
  value: T
}

interface IndexedDateCandidate extends IndexedValue<AppointmentResolvedDate> {}
interface IndexedTimeCandidate extends IndexedValue<AppointmentResolvedTime> {}

const WEEKDAY_INDEX: Record<string, number> = {
  domenica: 0,
  lunedi: 1,
  martedi: 2,
  mercoledi: 3,
  giovedi: 4,
  venerdi: 5,
  sabato: 6,
}

const BOOKING_PATTERN = /\b(prenot\w*|appuntament\w*|posto|fiss\w*|pass\w*|venir\w*)\b/i
const RESCHEDULE_PATTERN = /\b(spost\w*|riprogram\w*|rimand\w*|posticip\w*|anticip\w*|cambi\w*|cambio appunt\w*)\b/i
const CANCEL_PATTERN = /\b(annull\w*|disdi\w*|cancell\w*|saltare l appuntamento|non riesco piu)\b/i
const PRICING_PATTERN = /\b(prezz\w*|costa|costo|quanto viene|quanto costa|listino)\b/i
const OPENING_HOURS_PATTERN = /\b(orari|orario|apert|chiud|siete aperti|quando aprite|quando chiudete)\b/i
const HUMAN_REQUEST_PATTERN = /\b(operatore|persona|umano|staff|richiamatemi|chiamatemi)\b/i
const COMPLAINT_PATTERN = /\b(problema\w*|reclamo\w*|lament\w*|disservizio\w*|delus\w*|arrabbi\w*|incazz\w*|schifo|pessim\w*)\b/i
const PURE_GREETING_PATTERN = /^(ciao|salve|buongiorno|buonasera|hey|ehi)\b[!.,\s]*$/i
const UNKNOWN_PATTERN = /^[?!.,\s]+$/
const CONFIRMATION_PATTERN = /^(si|s|ok|va bene|perfetto|benissimo|d accordo|ci sta|👌|👍)\b/i

function isCancellationPolicyQuestion(text: string): boolean {
  return /(politica|policy).*(cancell)/i.test(text) || /(cancellazione).*(politica|policy)/i.test(text)
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

export function normalizeForSearch(value: string): string {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9:/.\-\s]/g, ' '),
  )
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

function formatIsoDate(value: Date): string {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildLocalDateAnchor(createdAt: string | null | undefined, timezone: string): Date {
  const reference = createdAt ? new Date(createdAt) : new Date()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference)

  const part = (type: 'year' | 'month' | 'day') =>
    Number(parts.find((entry) => entry.type === type)?.value ?? '0')

  return new Date(Date.UTC(part('year'), part('month') - 1, part('day'), 12, 0, 0))
}

function addDays(base: Date, delta: number): Date {
  const next = new Date(base)
  next.setUTCDate(next.getUTCDate() + delta)
  return next
}

export function findDateCandidates(
  text: string,
  messageId: string,
  createdAt: string,
  timezone: string,
): IndexedDateCandidate[] {
  const normalized = normalizeForSearch(text)
  const baseDate = buildLocalDateAnchor(createdAt, timezone)
  const candidates: IndexedDateCandidate[] = []

  const relativePattern = /\b(oggi|domani|dopodomani)\b/g
  for (const match of normalized.matchAll(relativePattern)) {
    const raw = match[1]
    const delta = raw === 'oggi' ? 0 : raw === 'domani' ? 1 : 2
    candidates.push({
      index: match.index ?? 0,
      value: {
        isoDate: formatIsoDate(addDays(baseDate, delta)),
        raw,
        sourceMessageId: messageId,
      },
    })
  }

  const weekdayPattern = /\b(domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)\b/g
  for (const match of normalized.matchAll(weekdayPattern)) {
    const raw = match[1]
    const targetDay = WEEKDAY_INDEX[raw]
    const currentDay = baseDate.getUTCDay()
    const delta = (targetDay - currentDay + 7) % 7
    candidates.push({
      index: match.index ?? 0,
      value: {
        isoDate: formatIsoDate(addDays(baseDate, delta)),
        raw,
        sourceMessageId: messageId,
      },
    })
  }

  const numericPattern = /\b(\d{1,2})[\/.-](\d{1,2})(?:[\/.-](\d{2,4}))?\b/g
  for (const match of normalized.matchAll(numericPattern)) {
    const day = Number(match[1])
    const month = Number(match[2])
    const yearValue = match[3]
    if (
      !Number.isInteger(day)
      || !Number.isInteger(month)
      || day < 1
      || day > 31
      || month < 1
      || month > 12
    ) {
      continue
    }

    let year = baseDate.getUTCFullYear()
    if (yearValue) {
      const parsedYear = Number(yearValue)
      if (Number.isInteger(parsedYear)) {
        year = parsedYear < 100 ? 2000 + parsedYear : parsedYear
      }
    }

    let candidateDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    if (!yearValue && candidateDate < baseDate) {
      candidateDate = new Date(Date.UTC(year + 1, month - 1, day, 12, 0, 0))
    }

    candidates.push({
      index: match.index ?? 0,
      value: {
        isoDate: formatIsoDate(candidateDate),
        raw: match[0],
        sourceMessageId: messageId,
      },
    })
  }

  return candidates.sort((left, right) => left.index - right.index)
}

function normalizeHour(
  rawHour: string,
  rawMinute: string | undefined,
): string {
  const hours = String(Number(rawHour)).padStart(2, '0')
  const minutes = rawMinute ? rawMinute.padStart(2, '0') : '00'
  return `${hours}:${minutes}`
}

export function findTimeCandidates(
  text: string,
  messageId: string,
): IndexedTimeCandidate[] {
  const normalized = normalizeForSearch(text)
  const candidates: IndexedTimeCandidate[] = []
  const explicitPattern = /\b(?:alle|per le|verso le|ore)\s*([01]?\d|2[0-3])(?::([0-5]\d))?\b/g

  for (const match of normalized.matchAll(explicitPattern)) {
    candidates.push({
      index: match.index ?? 0,
      value: {
        normalizedTime: normalizeHour(match[1], match[2]),
        raw: match[0],
        sourceMessageId: messageId,
      },
    })
  }

  const standalone = normalized.replace(/^[^0-9]+|[^0-9:]+$/g, '')
  if (candidates.length === 0 && /^\d{1,2}(?::\d{2})?$/.test(standalone) && normalized.length <= 10) {
    const [hours, minutes] = standalone.split(':')
    candidates.push({
      index: 0,
      value: {
        normalizedTime: normalizeHour(hours, minutes),
        raw: standalone,
        sourceMessageId: messageId,
      },
    })
  }

  return candidates.sort((left, right) => left.index - right.index)
}

export function findPreferredWindow(text: string): string | null {
  const normalized = normalizeForSearch(text)
  const match = normalized.match(/\b(prima mattina|tarda mattinata|mattina|pomeriggio|sera)\b/)
  return match?.[1] ?? null
}

function isPureGreeting(text: string): boolean {
  return PURE_GREETING_PATTERN.test(normalizeWhitespace(text))
}

function buildServiceTokenIndex(
  serviceCatalog: ResolveInboxConversationMemoryInput['serviceCatalog'],
) {
  return serviceCatalog.map((service) => {
    const normalizedName = normalizeForSearch(service.name)
    const tokens = normalizedName.split(' ').filter((token) => token.length >= 3)
    return {
      id: service.id,
      name: service.name,
      normalizedName,
      tokens,
    }
  })
}

function containsWholeExpression(text: string, expression: string): boolean {
  const escaped = expression.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|\\b)${escaped}(\\b|$)`, 'i').test(text)
}

export function resolveServiceMention(
  text: string,
  messageId: string,
  serviceCatalog: ResolveInboxConversationMemoryInput['serviceCatalog'],
): AppointmentResolvedService | null {
  if (serviceCatalog.length === 0) return null

  const normalized = normalizeForSearch(text)
  const indexed = buildServiceTokenIndex(serviceCatalog)
  const exactMatches = indexed.filter((service) => containsWholeExpression(normalized, service.normalizedName))

  if (exactMatches.length === 1) {
    return {
      id: exactMatches[0].id,
      name: exactMatches[0].name,
      raw: exactMatches[0].name,
      sourceMessageId: messageId,
    }
  }

  if (exactMatches.length > 1) {
    return null
  }

  const scored = indexed
    .map((service) => ({
      service,
      score: service.tokens.reduce((count, token) => {
        return normalized.includes(token) ? count + 1 : count
      }, 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) return right.score - left.score
      return right.service.normalizedName.length - left.service.normalizedName.length
    })

  if (scored.length === 0) return null
  if (
    scored.length > 1
    && scored[0].score === scored[1].score
    && scored[0].service.normalizedName.length === scored[1].service.normalizedName.length
  ) {
    return null
  }

  return {
    id: scored[0].service.id,
    name: scored[0].service.name,
    raw: scored[0].service.name,
    sourceMessageId: messageId,
  }
}

export function extractCurrentAppointmentReference(text: string): string | null {
  const normalized = normalizeWhitespace(text)
  const snippetMatch = normalized.match(
    /(?:appuntamento|prenotazione)(?:[^.!?]{0,80}?)(?=\s+(?:a|per)\s+(?:oggi|domani|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|\d{1,2}[\/.-]\d{1,2}|alle|ore)\b|[.!?]|$)/i,
  )
  if (snippetMatch?.[0] && snippetMatch[0].replace(/^(?:appuntamento|prenotazione)\b/i, '').trim().length >= 3) {
    return clipText(snippetMatch[0].trim(), 120)
  }

  return null
}

function shouldTrackAsRelevant(intent: AiDraftIntent, text: string): boolean {
  if (intent === 'booking' || intent === 'reschedule' || intent === 'cancel' || intent === 'conversational_followup') {
    return true
  }

  return BOOKING_PATTERN.test(text)
}

function buildQuestionForMissingField(
  missingField: AppointmentPreparationField | null,
  preferredWindow: string | null,
): string | null {
  switch (missingField) {
    case 'service':
      return 'Che servizio desideri?'
    case 'requested_date':
      return 'Per quale giorno preferisci?'
    case 'requested_time':
      return preferredWindow
        ? `Perfetto, nel ${preferredWindow} a che ora preferisci?`
        : 'A che ora preferisci?'
    case 'current_appointment_reference':
      return 'Quale appuntamento vuoi modificare o annullare?'
    default:
      return null
  }
}

function buildCustomerNotes(relevantCustomerTexts: string[]): string | null {
  if (relevantCustomerTexts.length === 0) return null

  const normalized = relevantCustomerTexts
    .map((text) => normalizeWhitespace(text))
    .filter(Boolean)
    .filter((text, index, values) => values.indexOf(text) === index)

  if (normalized.length === 0) return null
  return clipText(normalized.join(' | '), 320)
}

function buildConversationSummary(input: {
  service: AppointmentResolvedService | null
  requestedDate: AppointmentResolvedDate | null
  requestedTime: AppointmentResolvedTime | null
  preferredWindow: string | null
}): string | null {
  const parts: string[] = ['Richiesta di prenotazione']

  if (input.service) {
    parts.push(`servizio ${input.service.name}`)
  }

  if (input.requestedDate) {
    parts.push(`giorno ${input.requestedDate.isoDate}`)
  }

  if (input.requestedTime) {
    parts.push(`orario ${input.requestedTime.normalizedTime}`)
  } else if (input.preferredWindow) {
    parts.push(`fascia ${input.preferredWindow}`)
  }

  return clipText(parts.join(', '), 220)
}

function buildPreparedBookingToolCall(input: {
  service: AppointmentResolvedService
  requestedDate: AppointmentResolvedDate
  requestedTime: AppointmentResolvedTime
  customerNotes: string | null
  conversationSummary: string | null
}): AppointmentPreparedToolCall {
  return {
    name: 'prepare_appointment',
    arguments: {
      service: input.service.name,
      requested_date: input.requestedDate.isoDate,
      requested_time: input.requestedTime.normalizedTime,
      customer_notes: input.customerNotes ?? '',
      conversation_summary:
        input.conversationSummary
        ?? `Richiesta prenotazione ${input.service.name} ${input.requestedDate.isoDate} ${input.requestedTime.normalizedTime}`,
    },
  }
}

function looksLikeSlotOnlyFollowup(input: {
  text: string
  activeIntent: ActiveAppointmentIntent | null
  serviceCatalog: ResolveInboxConversationMemoryInput['serviceCatalog']
  messageId: string
  createdAt: string
  timezone: string
}): boolean {
  if (!input.activeIntent) return false

  const normalized = normalizeWhitespace(input.text)
  if (normalized.length === 0) return false

  if (CONFIRMATION_PATTERN.test(normalized)) {
    return true
  }

  if (resolveServiceMention(input.text, input.messageId, input.serviceCatalog)) {
    return true
  }

  if (findDateCandidates(input.text, input.messageId, input.createdAt, input.timezone).length > 0) {
    return true
  }

  if (findTimeCandidates(input.text, input.messageId).length > 0) {
    return true
  }

  return findPreferredWindow(input.text) !== null
}

function classifyCustomerIntent(input: {
  text: string
  activeIntent: ActiveAppointmentIntent | null
  serviceCatalog: ResolveInboxConversationMemoryInput['serviceCatalog']
  messageId: string
  createdAt: string
  timezone: string
}): AiDraftIntent {
  const normalized = normalizeWhitespace(input.text)
  if (normalized.length === 0 || UNKNOWN_PATTERN.test(normalized)) {
    return input.activeIntent ? 'conversational_followup' : 'unknown'
  }

  if (COMPLAINT_PATTERN.test(normalized)) return 'complaint'
  if (HUMAN_REQUEST_PATTERN.test(normalized)) return 'human_request'
  if (RESCHEDULE_PATTERN.test(normalized)) return 'reschedule'
  if (isCancellationPolicyQuestion(normalized)) return 'faq'
  if (CANCEL_PATTERN.test(normalized)) return 'cancel'
  if (PRICING_PATTERN.test(normalized)) return 'pricing'
  if (OPENING_HOURS_PATTERN.test(normalized)) return 'opening_hours'
  if (BOOKING_PATTERN.test(normalized)) return 'booking'
  if (isPureGreeting(normalized)) return 'greeting'

  if (looksLikeSlotOnlyFollowup(input)) {
    return 'conversational_followup'
  }

  if (normalized.length <= 4) {
    return input.activeIntent ? 'conversational_followup' : 'unknown'
  }

  if (/\?$/.test(normalized) || /\b(dove|come|quando|avete|fate|accettate|si puo|si può)\b/i.test(normalized)) {
    return 'faq'
  }

  return input.activeIntent ? 'conversational_followup' : 'unknown'
}

function updateAppointmentState(
  state: InternalAppointmentState,
  message: AiDraftMessage,
  serviceCatalog: ResolveInboxConversationMemoryInput['serviceCatalog'],
  timezone: string,
) {
  const service = resolveServiceMention(message.text, message.id, serviceCatalog)
  const dateCandidates = findDateCandidates(message.text, message.id, message.createdAt, timezone)
  const timeCandidates = findTimeCandidates(message.text, message.id)
  const preferredWindow = findPreferredWindow(message.text)

  if (service) {
    state.lastService = service
  }

  const currentReference =
    state.activeIntent === 'reschedule' || state.activeIntent === 'cancel'
      ? extractCurrentAppointmentReference(message.text)
      : null
  if (state.activeIntent === 'reschedule' || state.activeIntent === 'cancel') {
    if (currentReference) {
      state.currentAppointmentReference = currentReference
    }
  }

  if (dateCandidates.length > 0) {
    state.lastDate = dateCandidates.at(-1)?.value ?? state.lastDate
  }

  if (timeCandidates.length > 0) {
    if (
      state.activeIntent === 'reschedule'
      && currentReference
      && dateCandidates.length >= 2
      && timeCandidates.length === 1
    ) {
      state.lastTime = null
    } else {
      state.lastTime = timeCandidates.at(-1)?.value ?? state.lastTime
    }
  }

  if (preferredWindow) {
    state.preferredWindow = preferredWindow
  }

  if (shouldTrackAsRelevant(state.latestIntent, message.text)) {
    state.relevantCustomerTexts.push(message.text)
    if (state.relevantCustomerTexts.length > 6) {
      state.relevantCustomerTexts.splice(0, state.relevantCustomerTexts.length - 6)
    }
  }
}

function buildBookingPlanner(state: InternalAppointmentState) {
  const completeFields: AppointmentPreparationField[] = []
  const missingFields: AppointmentPreparationField[] = []

  if (state.lastService) {
    completeFields.push('service')
  } else {
    missingFields.push('service')
  }

  if (state.lastDate) {
    completeFields.push('requested_date')
  } else {
    missingFields.push('requested_date')
  }

  if (state.lastTime) {
    completeFields.push('requested_time')
  } else {
    missingFields.push('requested_time')
  }

  const firstMissingField = missingFields[0] ?? null
  const customerNotes = buildCustomerNotes(state.relevantCustomerTexts)
  const conversationSummary = buildConversationSummary({
    service: state.lastService,
    requestedDate: state.lastDate,
    requestedTime: state.lastTime,
    preferredWindow: state.preferredWindow,
  })

  return {
    state:
      firstMissingField === 'service'
        ? 'appointment_missing_service'
        : firstMissingField === 'requested_date'
          ? 'appointment_missing_date'
          : firstMissingField === 'requested_time'
            ? 'appointment_missing_time'
            : 'appointment_complete',
    action: 'booking' as const,
    completeFields,
    missingFields,
    nextQuestion: buildQuestionForMissingField(firstMissingField, state.preferredWindow),
    service: state.lastService,
    requestedDate: state.lastDate,
    requestedTime: state.lastTime,
    currentAppointmentReference: null,
    preferredWindow: state.preferredWindow,
    customerNotes,
    conversationSummary,
    preparedToolCall:
      state.lastService && state.lastDate && state.lastTime
        ? buildPreparedBookingToolCall({
            service: state.lastService,
            requestedDate: state.lastDate,
            requestedTime: state.lastTime,
            customerNotes,
            conversationSummary,
          })
        : null,
  }
}

export function resolveInboxConversationMemory(
  input: ResolveInboxConversationMemoryInput,
): InboxConversationMemory {
  const state: InternalAppointmentState = {
    activeIntent: null,
    latestIntent: 'unknown',
    lastService: null,
    lastDate: null,
    lastTime: null,
    currentAppointmentReference: null,
    preferredWindow: null,
    relevantCustomerTexts: [],
  }

  for (const message of sortMessages(input.messages)) {
    if (message.author !== 'customer') {
      continue
    }

    const rememberedService = resolveServiceMention(message.text, message.id, input.serviceCatalog)
    if (rememberedService) {
      state.lastService = rememberedService
    }

    const intent = classifyCustomerIntent({
      text: message.text,
      activeIntent: state.activeIntent,
      serviceCatalog: input.serviceCatalog,
      messageId: message.id,
      createdAt: message.createdAt,
      timezone: input.timezone,
    })

    state.latestIntent = intent

    if (intent === 'booking' || intent === 'reschedule' || intent === 'cancel') {
      state.activeIntent = intent
    }

    if (
      intent === 'booking'
      || intent === 'reschedule'
      || intent === 'cancel'
      || intent === 'conversational_followup'
      || state.activeIntent !== null
    ) {
      updateAppointmentState(state, message, input.serviceCatalog, input.timezone)
    }
  }

  const planner = state.activeIntent === 'booking'
    ? buildBookingPlanner(state)
    : null

  return {
    latestIntent: state.latestIntent,
    activeIntent: state.activeIntent,
    lastService: state.lastService,
    lastDate: state.lastDate,
    lastTime: state.lastTime,
    lastAppointmentReference: state.currentAppointmentReference,
    lastMissingSlot: planner?.missingFields[0] ?? null,
    planner,
  }
}
