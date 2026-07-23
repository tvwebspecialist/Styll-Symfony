import type {
  AiDraftIntent,
  AiDraftSource,
  InboxAiCustomFaqTopic,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'

export type DeterministicFaqResolverName =
  | 'greeting'
  | 'pricing'
  | 'opening_hours'
  | 'custom_faq'

export type DeterministicFaqResolutionReasonCode =
  | 'not_applicable'
  | 'greeting_resolved'
  | 'pricing_resolved'
  | 'pricing_catalog_empty'
  | 'pricing_service_missing'
  | 'pricing_service_price_missing'
  | 'pricing_service_ambiguous'
  | 'opening_hours_resolved_day'
  | 'opening_hours_resolved_weekly'
  | 'opening_hours_closed_day'
  | 'opening_hours_missing'
  | 'custom_faq_resolved'
  | 'custom_faq_missing'
  | 'custom_faq_ambiguous'

export interface DeterministicFaqResolution {
  attempted: boolean
  resolved: boolean
  resolver: DeterministicFaqResolverName | null
  reasonCode: DeterministicFaqResolutionReasonCode
  answerText: string | null
  supportingSources: AiDraftSource[]
  missingInformation: string[]
  ambiguousInformation: string[]
  operatorNote: string | null
  usedAuthoritativeKnowledge: boolean
}

const DAY_LABELS = [
  'domenica',
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
] as const

const CUSTOM_FAQ_TOPICS: Record<InboxAiCustomFaqTopic, {
  label: string
  keywords: string[]
}> = {
  payment_methods: {
    label: 'metodi di pagamento',
    keywords: ['pagamento', 'pagamenti', 'carta', 'carte', 'contanti', 'bancomat', 'satispay', 'pos'],
  },
  parking: {
    label: 'parcheggio',
    keywords: ['parcheggio', 'parcheggiare', 'parcheggi', 'posto auto', 'auto'],
  },
  late_arrival: {
    label: 'ritardi',
    keywords: ['ritardo', 'ritardi', 'tardo', 'arrivo in ritardo'],
  },
  cancellation_policy: {
    label: 'politica di cancellazione',
    keywords: ['cancellazione', 'disdetta', 'annullare', 'annullo', 'spostare', 'rimborso'],
  },
  accessibility: {
    label: 'accessibilita',
    keywords: ['accessibile', 'accessibilita', 'carrozzina', 'disabilita', 'ascensore'],
  },
  location_instructions: {
    label: 'indicazioni sede',
    keywords: ['dove siete', 'indirizzo', 'come arrivare', 'indicazioni', 'trovarvi', 'sede'],
  },
}

const GREETING_FORMAL_PATTERN = /\b(buongiorno|buonasera|salve|formale)\b/i
const AVAILABILITY_IMPLICATION_PATTERN = /\b(disponibil|disponibili|disponibile|posto|posti|liber[ioa]|appuntament[oi])\b/i

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function normalizeSearchText(value: string): string {
  return normalizeWhitespace(
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, ''),
  )
}

function formatPrice(value: number): string {
  const normalized = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
  return `EUR ${normalized}`
}

function normalizeWorkingHoursWindow(value: string): string {
  const normalized = normalizeWhitespace(value)
  const match = normalized.match(/^(\d{2}:\d{2})(?::\d{2})?-(\d{2}:\d{2})(?::\d{2})?$/)
  if (!match) return normalized
  return `${match[1]}-${match[2]}`
}

function ensureSentence(value: string): string {
  const normalized = normalizeWhitespace(value)
  if (normalized.length === 0) return normalized
  if (/[.!?]$/.test(normalized)) return normalized
  return `${normalized}.`
}

function latestCustomerMessage(request: PreparedInboxDraftRequest) {
  return [...request.messages].reverse().find((message) => message.author === 'customer') ?? null
}

function pickSources(
  request: PreparedInboxDraftRequest,
  refs: string[],
): AiDraftSource[] {
  const byRef = new Map(request.sources.map((source) => [source.ref, source] as const))
  const picked: AiDraftSource[] = []

  for (const ref of refs) {
    const source = byRef.get(ref)
    if (!source) continue
    if (picked.some((entry) => entry.ref === source.ref)) continue
    picked.push(source)
  }

  return picked
}

function result(input: Partial<DeterministicFaqResolution> & Pick<DeterministicFaqResolution, 'attempted' | 'resolved' | 'reasonCode'>): DeterministicFaqResolution {
  return {
    resolver: input.resolver ?? null,
    answerText: input.answerText ?? null,
    supportingSources: input.supportingSources ?? [],
    missingInformation: input.missingInformation ?? [],
    ambiguousInformation: input.ambiguousInformation ?? [],
    operatorNote: input.operatorNote ?? null,
    usedAuthoritativeKnowledge: input.usedAuthoritativeKnowledge ?? false,
    attempted: input.attempted,
    resolved: input.resolved,
    reasonCode: input.reasonCode,
  }
}

function greetingPrefix(greetingStyle: string | null): string {
  if (greetingStyle && GREETING_FORMAL_PATTERN.test(greetingStyle)) {
    return 'Buongiorno'
  }

  return 'Ciao'
}

function resolveGreeting(
  request: PreparedInboxDraftRequest,
): DeterministicFaqResolution {
  const tenantSourceRef = `tenant:${request.tenantId}:profile`
  const prefix = greetingPrefix(request.receptionistConfig.greetingStyle)
  const businessName = normalizeWhitespace(request.tenantProfile.businessName || 'il salone')

  return result({
    attempted: true,
    resolved: true,
    resolver: 'greeting',
    reasonCode: 'greeting_resolved',
    answerText: `${prefix}! Benvenuto da ${businessName}. Dimmi pure come posso aiutarti.`,
    supportingSources: pickSources(request, [tenantSourceRef]),
    usedAuthoritativeKnowledge: true,
  })
}

function findExplicitServiceMatches(
  request: PreparedInboxDraftRequest,
  text: string,
) {
  const normalizedText = normalizeSearchText(text)
  const seenNames = new Set<string>()
  const matches = []

  for (const service of request.serviceCatalog) {
    const normalizedName = normalizeSearchText(service.name)
    if (!normalizedName) continue

    if (seenNames.has(normalizedName)) {
      return {
        matches: [],
        ambiguous: [service.name],
      }
    }

    seenNames.add(normalizedName)
    const pattern = new RegExp(`(^|[^a-z0-9])${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i')
    if (!pattern.test(normalizedText)) continue

    matches.push(service)
  }

  return {
    matches,
    ambiguous: [],
  }
}

function resolvePricing(
  request: PreparedInboxDraftRequest,
  customerText: string,
): DeterministicFaqResolution {
  if (request.serviceCatalog.length === 0) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'pricing',
      reasonCode: 'pricing_catalog_empty',
      missingInformation: ['active_services'],
      operatorNote: 'Nessun servizio attivo disponibile nel catalogo del tenant.',
    })
  }

  const explicit = findExplicitServiceMatches(request, customerText)
  if (explicit.ambiguous.length > 0) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'pricing',
      reasonCode: 'pricing_service_ambiguous',
      ambiguousInformation: explicit.ambiguous,
      operatorNote: 'Il catalogo contiene servizi con nomi duplicati o indistinguibili.',
    })
  }

  if (explicit.matches.length > 0) {
    const missingPrice = explicit.matches.find((service) => service.price === null)
    if (missingPrice) {
      return result({
        attempted: true,
        resolved: false,
        resolver: 'pricing',
        reasonCode: 'pricing_service_price_missing',
        missingInformation: [missingPrice.name],
        operatorNote: `Il servizio ${missingPrice.name} non ha un prezzo configurato.`,
      })
    }

    const lines = explicit.matches.map((service) => {
      const duration = service.durationMinutes > 0 ? ` (${service.durationMinutes} min)` : ''
      return `${service.name}: ${formatPrice(service.price!)}${duration}`
    })

    return result({
      attempted: true,
      resolved: true,
      resolver: 'pricing',
      reasonCode: 'pricing_resolved',
      answerText: explicit.matches.length === 1
        ? `Il prezzo indicato per ${explicit.matches[0].name} e ${formatPrice(explicit.matches[0].price!)}.`
        : `I prezzi indicati sono: ${lines.join('; ')}.`,
      supportingSources: pickSources(
        request,
        explicit.matches.map((service) => `service:${service.id}`),
      ),
      usedAuthoritativeKnowledge: true,
    })
  }

  const normalizedCustomerText = normalizeSearchText(customerText)
  const isGenericCatalogQuestion =
    /\b(prezzi|listino|servizi)\b/.test(normalizedCustomerText)
    || /\bquanto costano\b/.test(normalizedCustomerText)

  if (!isGenericCatalogQuestion) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'pricing',
      reasonCode: 'pricing_service_missing',
      missingInformation: ['matched_service'],
      operatorNote: 'La richiesta sembra riferirsi a un servizio specifico non trovato nel catalogo attivo.',
    })
  }

  const pricedServices = request.serviceCatalog.filter((service) => service.price !== null).slice(0, 6)
  if (pricedServices.length === 0) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'pricing',
      reasonCode: 'pricing_service_price_missing',
      missingInformation: ['service_prices'],
      operatorNote: 'I servizi attivi non hanno prezzi configurati in modo utilizzabile.',
    })
  }

  return result({
    attempted: true,
    resolved: true,
    resolver: 'pricing',
    reasonCode: 'pricing_resolved',
    answerText: `I prezzi indicati al momento sono: ${pricedServices.map((service) => `${service.name}: ${formatPrice(service.price!)}`).join('; ')}.`,
    supportingSources: pickSources(
      request,
      pricedServices.map((service) => `service:${service.id}`),
    ),
    usedAuthoritativeKnowledge: true,
  })
}

function weekdayIndexForDate(
  date: Date,
  timeZone: string,
): number | null {
  const shortWeekday = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone,
  }).format(date)

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return map[shortWeekday] ?? null
}

function extractRequestedWeekday(
  text: string,
  timeZone: string,
  now: Date,
): number | null {
  const normalized = normalizeSearchText(text)

  if (/\boggi\b/.test(normalized)) {
    return weekdayIndexForDate(now, timeZone)
  }

  if (/\bdomani\b/.test(normalized)) {
    return weekdayIndexForDate(new Date(now.getTime() + 24 * 60 * 60 * 1000), timeZone)
  }

  if (/\bdopodomani\b/.test(normalized)) {
    return weekdayIndexForDate(new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), timeZone)
  }

  return DAY_LABELS.findIndex((day) => normalized.includes(day))
}

function resolveOpeningHours(
  request: PreparedInboxDraftRequest,
  customerText: string,
  now: Date,
): DeterministicFaqResolution {
  const workingHourSources = request.sources.filter((source) => source.ref.startsWith('working_hours:'))
  if (workingHourSources.length === 0) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'opening_hours',
      reasonCode: 'opening_hours_missing',
      missingInformation: ['working_hours'],
      operatorNote: 'Gli orari del tenant non sono configurati.',
    })
  }

  const windowsByDay = new Map<number, string[]>()
  for (const source of workingHourSources) {
    const label = normalizeSearchText(source.label)
    const dayIndex = DAY_LABELS.findIndex((day) => label.includes(day))
    if (dayIndex === -1) continue
    windowsByDay.set(dayIndex, windowsByDay.get(dayIndex) ?? [])
  }

  for (const section of request.contextSections) {
    if (section.key !== 'working_hours') continue

    for (const line of section.text.split('\n')) {
      const normalizedLine = normalizeSearchText(line)
      const dayIndex = DAY_LABELS.findIndex((day) => normalizedLine.includes(day))
      if (dayIndex === -1) continue

      const scheduleText = line.split(':').slice(1).join(':').trim()
      if (!scheduleText) continue

      const windows = scheduleText
        .split(',')
        .map((entry) => normalizeWhitespace(entry))
        .filter(Boolean)
        .map(normalizeWorkingHoursWindow)

      windowsByDay.set(dayIndex, windows)
    }
  }

  const requestedDay = extractRequestedWeekday(
    customerText,
    request.tenantProfile.timezone,
    now,
  )
  const addsAvailabilityClarifier = AVAILABILITY_IMPLICATION_PATTERN.test(customerText)
  const clarifier = addsAvailabilityClarifier
    ? ' Questi sono gli orari del salone e non confermano disponibilita appuntamenti.'
    : ' Si tratta degli orari del salone, non della disponibilita appuntamenti.'

  if (requestedDay !== null && requestedDay >= 0) {
    const sourceRefs = workingHourSources
      .filter((source) => normalizeSearchText(source.label).includes(DAY_LABELS[requestedDay]))
      .map((source) => source.ref)
    const windows = windowsByDay.get(requestedDay) ?? []

    if (windows.length === 0) {
      return result({
        attempted: true,
        resolved: true,
        resolver: 'opening_hours',
        reasonCode: 'opening_hours_closed_day',
        answerText: `Il ${DAY_LABELS[requestedDay]} il salone risulta chiuso.${clarifier}`,
        supportingSources: workingHourSources,
        usedAuthoritativeKnowledge: true,
      })
    }

    return result({
      attempted: true,
      resolved: true,
      resolver: 'opening_hours',
      reasonCode: 'opening_hours_resolved_day',
      answerText: `Il ${DAY_LABELS[requestedDay]} il salone e aperto ${windows.join(', ')}.${clarifier}`,
      supportingSources: pickSources(request, sourceRefs),
      usedAuthoritativeKnowledge: true,
    })
  }

  const summary = DAY_LABELS.map((dayLabel, dayIndex) => {
    const windows = windowsByDay.get(dayIndex) ?? []
    return windows.length === 0
      ? `${dayLabel}: chiuso`
      : `${dayLabel}: ${windows.join(', ')}`
  }).join('; ')

  return result({
    attempted: true,
    resolved: true,
    resolver: 'opening_hours',
    reasonCode: 'opening_hours_resolved_weekly',
    answerText: `Gli orari indicati sono: ${summary}.${clarifier}`,
    supportingSources: workingHourSources,
    usedAuthoritativeKnowledge: true,
  })
}

function matchedCustomFaqTopics(
  request: PreparedInboxDraftRequest,
  customerText: string,
): InboxAiCustomFaqTopic[] {
  const normalized = normalizeSearchText(customerText)
  const matched = new Set<InboxAiCustomFaqTopic>()

  for (const faq of request.customFaqCatalog) {
    const topicConfig = CUSTOM_FAQ_TOPICS[faq.topic]
    const topicKeywords = [...topicConfig.keywords, topicConfig.label]

    if (topicKeywords.some((keyword) => normalized.includes(normalizeSearchText(keyword)))) {
      matched.add(faq.topic)
    }
  }

  return [...matched]
}

function resolveCustomFaq(
  request: PreparedInboxDraftRequest,
  customerText: string,
): DeterministicFaqResolution {
  const matchedTopics = matchedCustomFaqTopics(request, customerText)
  if (matchedTopics.length === 0) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'custom_faq',
      reasonCode: 'custom_faq_missing',
      missingInformation: ['custom_faq_match'],
      operatorNote: 'Nessuna FAQ personalizzata del tenant corrisponde in modo conservativo alla richiesta.',
    })
  }

  if (matchedTopics.length > 1) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'custom_faq',
      reasonCode: 'custom_faq_ambiguous',
      ambiguousInformation: matchedTopics.map((topic) => CUSTOM_FAQ_TOPICS[topic].label),
      operatorNote: 'La richiesta combacia con piu FAQ personalizzate del tenant.',
    })
  }

  const matchedTopic = matchedTopics[0]
  const entries = request.customFaqCatalog.filter((faq) => faq.topic === matchedTopic)
  if (entries.length !== 1) {
    return result({
      attempted: true,
      resolved: false,
      resolver: 'custom_faq',
      reasonCode: 'custom_faq_ambiguous',
      ambiguousInformation: [CUSTOM_FAQ_TOPICS[matchedTopic].label],
      operatorNote: 'La configurazione FAQ del tenant contiene piu risposte attive per lo stesso topic.',
    })
  }

  return result({
    attempted: true,
    resolved: true,
    resolver: 'custom_faq',
    reasonCode: 'custom_faq_resolved',
    answerText: ensureSentence(entries[0].answer),
    supportingSources: pickSources(request, [`faq:${matchedTopic}`]),
    usedAuthoritativeKnowledge: true,
  })
}

export function resolveDeterministicFaqDraft(input: {
  request: PreparedInboxDraftRequest
  intent: AiDraftIntent
  now?: Date
}): DeterministicFaqResolution {
  const customerMessage = latestCustomerMessage(input.request)
  if (!customerMessage) {
    return result({
      attempted: false,
      resolved: false,
      reasonCode: 'not_applicable',
    })
  }

  const customerText = customerMessage.text
  switch (input.intent) {
    case 'greeting':
      return resolveGreeting(input.request)
    case 'pricing':
      return resolvePricing(input.request, customerText)
    case 'opening_hours':
      return resolveOpeningHours(input.request, customerText, input.now ?? new Date())
    case 'faq':
      return resolveCustomFaq(input.request, customerText)
    default:
      return result({
        attempted: false,
        resolved: false,
        reasonCode: 'not_applicable',
      })
  }
}
