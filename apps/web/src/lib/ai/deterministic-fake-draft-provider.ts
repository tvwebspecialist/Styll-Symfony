import type {
  AiConversationUnderstanding,
  AiDraftIntent,
  AiDraftMessage,
  AiDraftProvider,
  AiDraftRequest,
  AiDraftResponse,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'
import {
  extractCurrentAppointmentReference,
  findDateCandidates,
  findTimeCandidates,
  resolveServiceMention,
} from './inbox-memory-resolver.ts'
import {
  buildReceptionistPreparedToolCall,
  inferWordBasedTimeForConversation,
  resolveDeterministicReceptionistConversationState,
  resolveReceptionistConversationState,
} from './receptionist-conversation-state.ts'

function findSection(
  input: AiDraftRequest,
  key: 'services' | 'tenant_profile' | 'working_hours',
): string {
  return input.contextSections.find((section) => section.key === key)?.text ?? ''
}

function findSourceRefsByPrefix(input: AiDraftRequest, prefix: string): string[] {
  return input.sources
    .filter((source) => source.ref.startsWith(prefix))
    .map((source) => source.ref)
}

function getLatestMessage(
  input: AiDraftRequest,
  author?: AiDraftMessage['author'],
): AiDraftMessage | null {
  const messages = author
    ? input.messages.filter((message) => message.author === author)
    : input.messages

  return messages.at(-1) ?? null
}

function readTenantBusinessName(input: AiDraftRequest): string {
  const tenantProfile = findSection(input, 'tenant_profile')
  const businessNameLine = tenantProfile
    .split('\n')
    .find((line) => line.startsWith('business_name='))

  return businessNameLine?.slice('business_name='.length).trim() || 'il salone'
}

function isPreparedRequest(input: AiDraftRequest): input is PreparedInboxDraftRequest {
  return 'conversationMemory' in input
    && 'serviceCatalog' in input
    && 'tenantProfile' in input
}

function shouldReferenceWorkingHours(text: string): boolean {
  return /(orari|apert|chiud|oggi|domani)/i.test(text)
}

function shouldReferenceServices(text: string): boolean {
  return /(prezz|cost|quanto|serviz|taglio|barba)/i.test(text)
}

function isComplaint(text: string): boolean {
  return /(problema\w*|male|pessim\w*|delus\w*|reclamo\w*|lament\w*|disservizio\w*|arrabbi\w*)/i.test(text)
}

function isGreeting(text: string): boolean {
  return /^(ciao|salve|buongiorno|buonasera|hey|ehi)\b[!.,\s]*$/i.test(text.trim())
}

function isUnknown(text: string): boolean {
  const normalized = text.trim()

  return (
    normalized.length === 0
    || /^[?!.\s]+$/.test(normalized)
    || /^(boh|help|mah)\??$/i.test(normalized)
  )
}

function isHumanRequest(text: string): boolean {
  return /(operatore|persona|umano|staff)/i.test(text)
}

function isPricing(text: string): boolean {
  return /(prezz\w*|costo|costa|quanto viene|quanto costa|listino)/i.test(text)
}

function isOpeningHours(text: string): boolean {
  return /(orari|orario|apert|chiud|siete aperti|quando aprite|quando chiudete)/i.test(text)
}

function isReschedule(text: string): boolean {
  return /(spost\w*|cambi\w*|riprogram\w*|rimand\w*|posticip\w*|anticip\w*)/i.test(text)
}

function isCancel(text: string): boolean {
  if (/(politica|policy).*(cancell)/i.test(text) || /(cancellazione).*(politica|policy)/i.test(text)) {
    return false
  }

  return /(annull\w*|disdi\w*|cancell\w*)/i.test(text)
}

function isBooking(text: string): boolean {
  return /(prenot\w*|appuntament\w*|posto|fiss\w*|venir\w*|pass\w*)/i.test(text)
}

function fallbackIntent(input: AiDraftRequest, latestText: string): AiDraftIntent {
  if (isComplaint(latestText)) return 'complaint'
  if (isHumanRequest(latestText)) return 'human_request'
  if (isReschedule(latestText)) return 'reschedule'
  if (isCancel(latestText)) return 'cancel'
  if (isPricing(latestText)) return 'pricing'
  if (isOpeningHours(latestText)) return 'opening_hours'
  if (isBooking(latestText)) return 'booking'
  if (isGreeting(latestText)) return 'greeting'
  if (isUnknown(latestText)) return 'unknown'

  const latestCustomerMessage = getLatestMessage(input, 'customer')
  const previousCustomerMessage = latestCustomerMessage && input.messages.length > 1
    ? input.messages.filter((message) => message.author === 'customer').at(-2)
    : null

  if (
    previousCustomerMessage
    && (isBooking(previousCustomerMessage.text) || isReschedule(previousCustomerMessage.text) || isCancel(previousCustomerMessage.text))
    && latestText.trim().length <= 24
  ) {
    return 'conversational_followup'
  }

  return 'faq'
}

function formatServiceLine(servicesSummary: string): string | null {
  const line = servicesSummary
    .split('\n')
    .find(Boolean)
    ?.replace(/^- /, '')
    .trim()

  return line ?? null
}

function buildDraftText(
  input: AiDraftRequest,
  intent: AiDraftIntent,
  state?: PreparedInboxDraftRequest['receptionistState'],
): string {
  const businessName = readTenantBusinessName(input)
  const servicesSummary = formatServiceLine(findSection(input, 'services'))
  const workingHoursSummary = findSection(input, 'working_hours')
    .split('\n')
    .find(Boolean)
    ?.replace(/^- /, '')
    .trim()

  if (isPreparedRequest(input)) {
    const receptionistState = state ?? input.receptionistState
    const preparedToolCall = buildReceptionistPreparedToolCall(receptionistState)

    if (
      (intent === 'conversational_followup'
        || intent === 'booking'
        || intent === 'reschedule'
        || intent === 'cancel')
      && receptionistState.nextQuestion
    ) {
      return receptionistState.nextQuestion
    }

    if (preparedToolCall?.name === 'prepare_booking_sandbox') {
      const service = receptionistState.service ? receptionistState.service.toLowerCase() : 'appuntamento'
      const date = receptionistState.requestedDate ?? 'la data richiesta'
      const time = receptionistState.requestedTime
        ? receptionistState.requestedTime.replace(':00', '')
        : "l'orario richiesto"
      return `Perfetto, preparo la prenotazione per ${service} il ${date} alle ${time}.`
    }

    if (
      receptionistState.activeGoal === 'booking'
      && receptionistState.service
      && receptionistState.requestedDate
      && receptionistState.requestedTime
    ) {
      return 'Controllo la disponibilita.'
    }

    if (preparedToolCall?.name === 'prepare_reschedule') {
      return 'Perfetto, preparo la richiesta di spostamento per review umana.'
    }

    if (preparedToolCall?.name === 'prepare_cancellation') {
      return 'Perfetto, preparo la richiesta di cancellazione per review umana.'
    }
  }

  switch (intent) {
    case 'greeting':
      return `Ciao! Benvenuto da ${businessName} 👋`
    case 'pricing':
      return servicesSummary
        ? `Il riferimento disponibile e ${servicesSummary}.`
        : 'Verifico il prezzo corretto con il salone e ti confermo subito.'
    case 'opening_hours':
      return workingHoursSummary
        ? `Siamo aperti ${workingHoursSummary}.`
        : 'Verifico subito gli orari aggiornati e ti confermo.'
    case 'booking':
      return 'Certo.'
    case 'reschedule':
      return 'Certo, preparo lo spostamento appena ho i dettagli giusti.'
    case 'cancel':
      return 'Certo, preparo la cancellazione appena verifico quale appuntamento intendi.'
    case 'human_request':
      return 'Ti passo subito a un operatore.'
    case 'complaint':
      return 'Mi dispiace. Faccio intervenire subito un operatore.'
    case 'conversational_followup':
      return 'Perfetto.'
    case 'unknown':
      return `Ciao, ti faccio aiutare subito dal team di ${businessName}.`
    case 'faq':
    default:
      return `Certo, verifico il dettaglio per ${businessName} e ti rispondo in modo preciso.`
  }
}

function buildReasoning(intent: AiDraftIntent): string {
  switch (intent) {
    case 'pricing':
      return 'La richiesta riguarda il listino e deve usare solo servizi presenti nel contesto.'
    case 'opening_hours':
      return 'La richiesta riguarda gli orari e deve usare solo la sezione working_hours.'
    case 'booking':
      return 'La conversazione riguarda una prenotazione e il planner locale decide slot mancanti o completezza.'
    case 'reschedule':
      return 'La conversazione riguarda uno spostamento appuntamento con revisione umana.'
    case 'cancel':
      return 'La conversazione riguarda una cancellazione con revisione umana.'
    case 'human_request':
      return 'Il cliente chiede esplicitamente una persona del team.'
    case 'complaint':
      return 'Il tono suggerisce un reclamo e richiede handoff umano.'
    case 'conversational_followup':
      return 'Il messaggio dipende dal contesto precedente e va interpretato come follow-up.'
    case 'greeting':
      return 'Il messaggio e un saluto iniziale.'
    case 'faq':
      return 'La richiesta e informativa ma non abbastanza strutturata per un azione.'
    case 'unknown':
    default:
      return 'Il messaggio non e abbastanza chiaro per una risposta affidabile.'
  }
}

function buildConfidence(intent: AiDraftIntent): number {
  switch (intent) {
    case 'human_request':
    case 'complaint':
      return 0.96
    case 'pricing':
    case 'opening_hours':
    case 'booking':
    case 'reschedule':
    case 'cancel':
      return 0.9
    case 'conversational_followup':
      return 0.88
    case 'greeting':
      return 0.84
    case 'faq':
      return 0.82
    case 'unknown':
    default:
      return 0.42
  }
}

function detectCorrection(text: string): boolean {
  return /\b(anzi|invece|cambio|correggo|rettifico|no[, ]|non quello|piuttosto)\b/i.test(text)
}

function detectCustomerName(text: string): string | null {
  const match = text.match(/\b(?:mi chiamo|sono)\s+([A-Za-zÀ-ÖØ-öø-ÿ' -]{2,80})/i)
  return match?.[1]?.trim() ?? null
}

function buildStructuredUnderstanding(
  input: PreparedInboxDraftRequest,
  intent: AiDraftIntent,
  latestCustomerMessage: AiDraftMessage | null,
): AiConversationUnderstanding {
  const latestText = latestCustomerMessage?.text ?? ''
  const latestId = latestCustomerMessage?.id ?? 'provider'
  const receptionistState = input.receptionistState
    ?? resolveDeterministicReceptionistConversationState({
      messages: input.messages,
      serviceCatalog: input.serviceCatalog,
      timezone: input.tenantProfile.timezone,
      conversationMemory: input.conversationMemory,
    })
  const detectedService = resolveServiceMention(latestText, latestId, input.serviceCatalog)?.name
    ?? resolveServiceMention(
      input.conversationMemory.lastService?.name ?? '',
      latestId,
      input.serviceCatalog,
    )?.name
    ?? null

  const requestedDate = input.conversationMemory.lastDate?.sourceMessageId === latestId
    ? input.conversationMemory.lastDate.isoDate
    : /\b(oggi|domani|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|\d{1,2}[\/.-]\d{1,2})\b/i.test(latestText)
      ? input.conversationMemory.lastDate?.isoDate ?? null
      : null
  const appointmentReference =
    intent === 'reschedule' || intent === 'cancel'
      ? extractCurrentAppointmentReference(latestText) ?? input.conversationMemory.lastAppointmentReference
      : null

  const explicitTime = input.conversationMemory.lastTime?.sourceMessageId === latestId
    ? input.conversationMemory.lastTime.normalizedTime
    : null
  const timeCandidates = latestCustomerMessage
    ? findTimeCandidates(latestText, latestId)
    : []
  const dateCandidates = latestCustomerMessage
    ? findDateCandidates(
        latestText,
        latestId,
        latestCustomerMessage.createdAt,
        input.tenantProfile.timezone,
      )
    : []
  const requestedTime = (
    intent === 'reschedule'
      && appointmentReference
      && timeCandidates.length === 1
      && dateCandidates.length >= 2
  )
    ? null
    : explicitTime
    ?? inferWordBasedTimeForConversation({
      text: latestText,
      activeGoal: receptionistState.activeGoal,
    })
    ?? null

  const correction = detectCorrection(latestText)

  return {
    intent,
    confidence: buildConfidence(intent),
    handoff: intent === 'human_request' || intent === 'complaint' || intent === 'unknown',
    entities: {
      service: detectedService,
      requestedDate,
      requestedTime,
      appointmentReference,
      customerName: detectCustomerName(latestText),
      customerNotes: latestText.trim().length > 0 ? latestText.trim() : null,
    },
    corrections: {
      replacesService: correction && detectedService !== null,
      replacesDate: correction && requestedDate !== null,
      replacesTime: correction && requestedTime !== null,
    },
    citedSources: latestCustomerMessage?.sourceRef ? [latestCustomerMessage.sourceRef] : [],
    requestedToolCalls: [],
  }
}

export const deterministicFakeDraftProvider: AiDraftProvider = {
  providerId: 'deterministic_fake_draft_v1',
  async generateDraft(input: AiDraftRequest): Promise<AiDraftResponse> {
    const latestCustomerMessage = getLatestMessage(input, 'customer')
    const latestAnyMessage = getLatestMessage(input)
    const latestText = latestCustomerMessage?.text ?? latestAnyMessage?.text ?? ''
    const intent = isPreparedRequest(input)
      ? input.conversationMemory.latestIntent
      : fallbackIntent(input, latestText)
    const citedSources = new Set<string>()
    const requestedToolCalls: AiDraftResponse['requestedToolCalls'] = []
    const understanding = isPreparedRequest(input)
      ? buildStructuredUnderstanding(input, intent, latestCustomerMessage)
      : {
          intent,
          confidence: buildConfidence(intent),
          handoff: intent === 'human_request' || intent === 'complaint' || intent === 'unknown',
          entities: {
            service: null,
            requestedDate: null,
            requestedTime: null,
            appointmentReference: null,
            customerName: detectCustomerName(latestText),
            customerNotes: latestText.trim() || null,
          },
          corrections: {
            replacesService: false,
            replacesDate: false,
            replacesTime: false,
          },
          citedSources: [],
          requestedToolCalls: [],
        } satisfies AiConversationUnderstanding
    const mergedState = isPreparedRequest(input)
      ? resolveReceptionistConversationState({
          messages: input.messages,
          serviceCatalog: input.serviceCatalog,
          timezone: input.tenantProfile.timezone,
          conversationMemory: input.conversationMemory,
          understanding,
        })
      : null

    if (latestCustomerMessage?.sourceRef) {
      citedSources.add(latestCustomerMessage.sourceRef)
    }

    if (shouldReferenceWorkingHours(latestText)) {
      for (const ref of findSourceRefsByPrefix(input, 'working_hours:').slice(0, 2)) {
        citedSources.add(ref)
      }
    }

    if (shouldReferenceServices(latestText)) {
      for (const ref of findSourceRefsByPrefix(input, 'service:').slice(0, 3)) {
        citedSources.add(ref)
      }
    }

    if (citedSources.size === 0) {
      citedSources.add(`tenant:${input.tenantId}:profile`)
    }

    if (intent === 'human_request' || intent === 'complaint') {
      requestedToolCalls.push({
        name: 'request_human_handoff',
        arguments: {
          reason: intent === 'complaint' ? 'customer_complaint' : 'customer_requested_human',
        },
      })
    } else if (isPreparedRequest(input)) {
      const preparedToolCall = mergedState
        ? buildReceptionistPreparedToolCall(mergedState)
        : null
      if (preparedToolCall) {
        requestedToolCalls.push({
          name: preparedToolCall.name,
          arguments: preparedToolCall.arguments,
        })
      } else if (mergedState?.activeGoal === 'reschedule') {
        requestedToolCalls.push({
          name: 'prepare_reschedule',
          arguments: {
            source: 'conversation_state',
          },
        })
      } else if (mergedState?.activeGoal === 'cancel') {
        requestedToolCalls.push({
          name: 'prepare_cancellation',
          arguments: {
            source: 'conversation_state',
          },
        })
      } else if (mergedState?.activeGoal === 'booking') {
        requestedToolCalls.push({
          name: 'search_availability',
          arguments: {
            source: 'conversation_state',
          },
        })
      }
    }

    understanding.citedSources = [...citedSources]
    understanding.requestedToolCalls = requestedToolCalls

    return {
      draftText: buildDraftText(input, intent, mergedState ?? undefined),
      confidence: buildConfidence(intent),
      intent,
      handoff: intent === 'human_request' || intent === 'complaint' || intent === 'unknown',
      understanding,
      internalReasoning: buildReasoning(intent),
      citedSources: [...citedSources],
      requestedToolCalls,
      providerRunId: `local-draft:${input.conversationId}:${input.promptVersion}`,
    }
  },
}
