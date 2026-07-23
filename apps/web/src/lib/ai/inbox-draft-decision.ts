import type { InboxToolName } from '../messaging/contracts.ts'
import { getInboxToolDefinition } from '../messaging/tool-registry.ts'
import type {
  AvailabilityResult,
  AiDraftIntent,
  AiDraftSource,
  AppointmentPreparationField,
  AppointmentPlannerState,
  AppointmentPreparedToolCall,
  InboxAiReceptionistMode,
  PreparedInboxDraftRequest,
  ReceptionistConversationState,
} from './draft-provider.ts'
import type { DeterministicFaqResolution } from './inbox-deterministic-faq-resolver.ts'
import type { InboxDraftRequestedToolCall } from './inbox-draft-orchestrator-core.ts'
import {
  buildReceptionistConversationSummary,
  resolveDeterministicReceptionistConversationState,
  buildReceptionistPreparedToolCall,
} from './receptionist-conversation-state.ts'

export type { AppointmentPreparationField } from './draft-provider.ts'

const HUMAN_HANDOFF_INTENTS = new Set<AiDraftIntent>([
  'complaint',
  'human_request',
  'unknown',
])

const LOW_RISK_AUTO_REPLY_INTENTS = new Set<AiDraftIntent>([
  'faq',
  'greeting',
  'pricing',
  'opening_hours',
])

type AppointmentDecisionToolName =
  | 'prepare_booking_sandbox'
  | 'prepare_appointment'
  | 'prepare_reschedule'
  | 'prepare_cancellation'

export type InboxDraftDecisionKind =
  | 'draft_review'
  | 'human_handoff'
  | 'auto_reply_candidate'
  | 'action_prepare_candidate'
  | 'blocked'

export type InboxDraftDecisionReasonCode =
  | 'tenant_mode_disabled'
  | 'provider_response_incomplete'
  | 'provider_not_configured'
  | 'provider_timeout'
  | 'provider_malformed_response'
  | 'provider_failed'
  | 'provider_requested_handoff'
  | 'intent_requires_human'
  | 'confidence_below_threshold'
  | 'missing_required_sources'
  | 'authoritative_answer_missing'
  | 'authoritative_answer_ambiguous'
  | 'authoritative_answer_unavailable'
  | 'human_control_active'
  | 'ai_paused'
  | 'tool_policy_denied'
  | 'draft_only_mode'
  | 'auto_reply_ready'
  | 'auto_reply_policy_blocked'
  | 'auto_reply_intent_not_allowed'
  | 'auto_reply_mutating_tool_requested'
  | 'action_missing_fields'
  | 'action_ready'
  | 'appointment_missing_service'
  | 'appointment_missing_date'
  | 'appointment_missing_time'
  | 'availability_available'
  | 'availability_unavailable'
  | 'availability_business_closed'
  | 'availability_missing_information'
  | 'appointment_complete'
  | 'manual_review_default'

export type AppointmentPreparationAction =
  | 'booking'
  | 'reschedule'
  | 'cancellation'

export interface AppointmentPreparationStatus {
  action: AppointmentPreparationAction
  requestedToolName: AppointmentDecisionToolName
  plannerState: AppointmentPlannerState
  eligible: boolean
  completeFields: AppointmentPreparationField[]
  missingFields: AppointmentPreparationField[]
  nextQuestion: string | null
  preparedToolCall: AppointmentPreparedToolCall | null
  service: string | null
  requestedDate: string | null
  requestedTime: string | null
  appointmentReference: string | null
  customerName: string | null
  customerNotes: string | null
  conversationSummary: string | null
  availabilityResult: AvailabilityResult | null
}

export interface InboxDraftDecision {
  kind: InboxDraftDecisionKind
  reasonCode: InboxDraftDecisionReasonCode
  reasonSummary: string
  eligibleToolNames: InboxToolName[]
  missingRequiredFields: AppointmentPreparationField[]
  handoffRecommended: boolean
  appointmentPreparation: AppointmentPreparationStatus | null
}

export interface ResolveInboxDraftDecisionInput {
  request: PreparedInboxDraftRequest
  result: {
    confidence: number | null
    intent: AiDraftIntent
    handoff: boolean
    draftText: string
    citedSources: AiDraftSource[]
    requestedToolCalls: InboxDraftRequestedToolCall[]
    availabilityResult: AvailabilityResult | null
    understanding: {
      intent: AiDraftIntent
      confidence: number | null
      handoff: boolean
    }
    receptionistState: ReceptionistConversationState
    authoritativeResolution?: DeterministicFaqResolution | null
  }
}

const DECISION_REASON_SUMMARIES: Record<InboxDraftDecisionReasonCode, string> = {
  tenant_mode_disabled: 'L AI receptionist e disattivata per questo tenant.',
  provider_response_incomplete: 'La risposta AI non e abbastanza completa per essere instradata in sicurezza.',
  provider_not_configured: 'Il provider AI configurato non e disponibile correttamente per questo tenant.',
  provider_timeout: 'Il provider AI non ha risposto entro il tempo previsto.',
  provider_malformed_response: 'Il provider AI ha restituito un output strutturato non valido.',
  provider_failed: 'La generazione della bozza AI non e riuscita.',
  provider_requested_handoff: 'Il provider suggerisce esplicitamente il passaggio a un operatore umano.',
  intent_requires_human: 'L intento rilevato richiede presidio umano.',
  confidence_below_threshold: 'La confidenza del provider e troppo bassa per procedere senza handoff.',
  missing_required_sources: 'Le fonti citate non supportano abbastanza la risposta proposta.',
  authoritative_answer_missing: 'I dati tenant-scoped disponibili non bastano per produrre una risposta FAQ affidabile.',
  authoritative_answer_ambiguous: 'La richiesta FAQ corrisponde a dati tenant-scoped ambigui e richiede verifica umana.',
  authoritative_answer_unavailable: 'La risposta FAQ richiede dati tenant-scoped che non risultano configurati in modo utilizzabile.',
  human_control_active: 'La conversazione e gia sotto controllo umano.',
  ai_paused: 'L AI e gia in pausa per questa conversazione.',
  tool_policy_denied: 'Il tool richiesto non e autorizzato per questa modalita.',
  draft_only_mode: 'Questo tenant e in modalita draft-only: la bozza resta sempre sotto revisione umana.',
  auto_reply_ready: 'La risposta soddisfa i criteri conservativi per un futuro FAQ automatico supervisionato.',
  auto_reply_policy_blocked: 'La risposta non soddisfa i criteri conservativi per un FAQ candidate.',
  auto_reply_intent_not_allowed: 'L intento non e abilitato per il routing FAQ supervisionato di questo tenant.',
  auto_reply_mutating_tool_requested: 'La risposta richiede tool o conferme incompatibili con un FAQ candidate.',
  action_missing_fields: 'Mancano dati obbligatori prima di preparare un azione di business.',
  action_ready: 'La richiesta contiene i dati minimi per preparare un azione senza eseguirla.',
  appointment_missing_service: 'Manca ancora il servizio da prenotare.',
  appointment_missing_date: 'Manca ancora il giorno richiesto per la prenotazione.',
  appointment_missing_time: 'Manca ancora l orario richiesto per la prenotazione.',
  availability_available: 'Lo slot richiesto e disponibile e puo essere preparato in sandbox.',
  availability_unavailable: 'Lo slot richiesto non e disponibile e servono alternative reali.',
  availability_business_closed: 'L orario richiesto cade fuori dalle aperture disponibili.',
  availability_missing_information: 'La disponibilita non puo essere verificata in modo affidabile con i dati correnti.',
  appointment_complete: 'La richiesta contiene i dati minimi per preparare la prenotazione senza eseguirla.',
  manual_review_default: 'La bozza resta in revisione umana conservativa.',
}

export function resolveInboxDraftDecisionReasonSummary(
  reasonCode: InboxDraftDecisionReasonCode,
): string {
  return DECISION_REASON_SUMMARIES[reasonCode]
}

function hasKnowledgeSource(
  sources: AiDraftSource[],
  prefix: string,
): boolean {
  return sources.some((source) => source.ref.startsWith(prefix))
}

function resolveEffectiveIntent(
  request: PreparedInboxDraftRequest,
  providerIntent: AiDraftIntent,
  receptionistState: ReceptionistConversationState,
): AiDraftIntent {
  const memoryIntent = receptionistState.lastIntent ?? request.conversationMemory.latestIntent
  const activeIntent = receptionistState.activeGoal ?? request.conversationMemory.activeIntent

  if (
    memoryIntent === 'greeting'
    || memoryIntent === 'pricing'
    || memoryIntent === 'opening_hours'
    || memoryIntent === 'booking'
    || memoryIntent === 'reschedule'
    || memoryIntent === 'cancel'
    || memoryIntent === 'complaint'
    || memoryIntent === 'human_request'
  ) {
    return memoryIntent
  }

  if (memoryIntent === 'conversational_followup' && activeIntent) {
    return activeIntent
  }

  return providerIntent
}

function hasRequiredSourcesForIntent(
  request: PreparedInboxDraftRequest,
  result: ResolveInboxDraftDecisionInput['result'],
  effectiveIntent: AiDraftIntent,
): boolean {
  if (result.citedSources.length === 0) {
    return false
  }

  const sourceRefs = new Set(request.sources.map((source) => source.ref))
  if (
    result.citedSources.some(
      (source) => !sourceRefs.has(source.ref) && !source.ref.startsWith('tool_result:'),
    )
  ) {
    return false
  }

  switch (effectiveIntent) {
    case 'pricing':
      return hasKnowledgeSource(result.citedSources, 'service:')
    case 'opening_hours':
      return hasKnowledgeSource(result.citedSources, 'working_hours:')
    case 'faq':
      return hasKnowledgeSource(result.citedSources, 'faq:')
        || result.citedSources.some((source) =>
          source.kind === 'knowledge'
          || source.kind === 'policy'
          || source.kind === 'tool_result'
        )
    case 'greeting':
      return result.citedSources.some((source) => source.ref.startsWith('message:'))
        || hasKnowledgeSource(result.citedSources, 'tenant:')
    default:
      return true
  }
}

function isConversationHumanControlled(request: PreparedInboxDraftRequest): boolean {
  return (
    request.conversationState.ownershipMode === 'human'
    || request.conversationState.status === 'human_requested'
    || request.conversationState.status === 'human_assigned'
    || request.conversationState.status === 'human_active'
    || request.conversationState.status === 'waiting_staff_approval'
  )
}

function isAiPaused(request: PreparedInboxDraftRequest): boolean {
  return request.conversationState.status === 'ai_paused'
    || request.conversationState.aiPausedAt !== null
}

function isModeCandidateEnabled(mode: InboxAiReceptionistMode): boolean {
  return mode === 'supervised' || mode === 'autonomous_faq'
}

function authoritativeFailureReason(
  resolution: DeterministicFaqResolution | null | undefined,
): InboxDraftDecisionReasonCode | null {
  if (!resolution?.attempted || resolution.resolved) {
    return null
  }

  switch (resolution.reasonCode) {
    case 'pricing_service_ambiguous':
    case 'custom_faq_ambiguous':
      return 'authoritative_answer_ambiguous'
    case 'pricing_catalog_empty':
    case 'pricing_service_missing':
    case 'pricing_service_price_missing':
    case 'opening_hours_missing':
    case 'custom_faq_missing':
      return 'authoritative_answer_missing'
    default:
      return 'authoritative_answer_unavailable'
  }
}

function buildNextQuestion(
  action: AppointmentPreparationAction,
  missingField: AppointmentPreparationField | undefined,
): string | null {
  switch (missingField) {
    case 'service':
      return 'Che servizio desideri?'
    case 'requested_date':
      return action === 'booking'
        ? 'Per quale giorno preferisci?'
        : 'Per quale giorno va preparata la modifica?'
    case 'requested_time':
      return 'A che ora preferisci?'
    case 'current_appointment_reference':
      return 'Quale appuntamento vuoi modificare o annullare?'
    default:
      return null
  }
}

function buildDecision(
  kind: InboxDraftDecisionKind,
  reasonCode: InboxDraftDecisionReasonCode,
  input?: {
    handoffRecommended?: boolean
    appointmentPreparation?: AppointmentPreparationStatus | null
    eligibleToolNames?: InboxToolName[]
  },
): InboxDraftDecision {
  const appointmentPreparation = input?.appointmentPreparation ?? null
  return {
    kind,
    reasonCode,
    reasonSummary: DECISION_REASON_SUMMARIES[reasonCode],
    eligibleToolNames: input?.eligibleToolNames ?? [],
    missingRequiredFields: appointmentPreparation?.missingFields ?? [],
    handoffRecommended: input?.handoffRecommended ?? kind === 'human_handoff',
    appointmentPreparation,
  }
}

function resolveAutoReplyDecision(
  request: PreparedInboxDraftRequest,
  result: ResolveInboxDraftDecisionInput['result'],
  effectiveIntent: AiDraftIntent,
): InboxDraftDecision {
  const hasMutatingTool = result.requestedToolCalls.some((toolCall) => {
    const definition = getInboxToolDefinition(toolCall.name)
    return definition.category === 'prepare_mutation' || definition.category === 'confirm_mutation'
  })

  if (hasMutatingTool) {
    return buildDecision('draft_review', 'auto_reply_mutating_tool_requested')
  }

  if (!isModeCandidateEnabled(request.receptionistConfig.mode)) {
    return buildDecision('draft_review', 'draft_only_mode')
  }

  if (!request.receptionistConfig.allowedAutonomousIntents.includes(effectiveIntent)) {
    return buildDecision('draft_review', 'auto_reply_intent_not_allowed')
  }

  if ((result.confidence ?? 0) < request.receptionistConfig.autoReplyConfidenceThreshold) {
    return buildDecision('draft_review', 'auto_reply_policy_blocked')
  }

  return buildDecision('auto_reply_candidate', 'auto_reply_ready')
}

function buildBookingPreparation(
  receptionistState: ReceptionistConversationState,
  availabilityResult: AvailabilityResult | null,
): AppointmentPreparationStatus {
  const missingFields = receptionistState.missingFields.map((field) => {
    switch (field) {
      case 'service':
        return 'service'
      case 'requestedDate':
        return 'requested_date'
      case 'requestedTime':
        return 'requested_time'
      case 'appointmentReference':
        return 'current_appointment_reference'
    }
  })
  const completeFields: AppointmentPreparationField[] = []
  if (receptionistState.service) completeFields.push('service')
  if (receptionistState.requestedDate) completeFields.push('requested_date')
  if (receptionistState.requestedTime) completeFields.push('requested_time')
  const preparedToolCall = buildReceptionistPreparedToolCall(receptionistState, {
    availabilityResult,
  })

  let plannerState: AppointmentPlannerState = 'appointment_complete'
  let nextQuestion = receptionistState.nextQuestion

  if (missingFields[0] === 'service') {
    plannerState = 'appointment_missing_service'
  } else if (missingFields[0] === 'requested_date') {
    plannerState = 'appointment_missing_date'
  } else if (missingFields[0] === 'requested_time') {
    plannerState = 'appointment_missing_time'
  } else if (!availabilityResult) {
    plannerState = 'availability_missing_information'
  } else if (availabilityResult.reason === 'available') {
    plannerState = 'availability_available'
  } else if (availabilityResult.reason === 'business_closed') {
    plannerState = 'availability_business_closed'
    if (!missingFields.includes('requested_time')) {
      missingFields.push('requested_time')
    }
    nextQuestion = availabilityResult.suggestedSlots.length > 0
      ? 'Tra questi orari quale preferisci?'
      : 'A che ora preferisci?'
  } else if (availabilityResult.reason === 'slot_unavailable') {
    plannerState = 'availability_unavailable'
    if (!missingFields.includes('requested_time')) {
      missingFields.push('requested_time')
    }
    nextQuestion = availabilityResult.suggestedSlots.length > 0
      ? 'Tra questi orari quale preferisci?'
      : 'A che ora preferisci?'
  } else {
    plannerState = 'availability_missing_information'
  }

  return {
    action: 'booking',
    requestedToolName: 'prepare_booking_sandbox',
    plannerState,
    eligible: preparedToolCall?.name === 'prepare_booking_sandbox',
    completeFields,
    missingFields,
    nextQuestion,
    preparedToolCall: preparedToolCall?.name === 'prepare_booking_sandbox' ? preparedToolCall : null,
    service: receptionistState.service,
    requestedDate: receptionistState.requestedDate,
    requestedTime: receptionistState.requestedTime,
    appointmentReference: receptionistState.appointmentReference,
    customerName: receptionistState.customerName,
    customerNotes: receptionistState.customerNotes,
    conversationSummary: buildReceptionistConversationSummary(receptionistState),
    availabilityResult,
  }
}

function reasonFromPlannerState(
  plannerState: AppointmentPlannerState,
): InboxDraftDecisionReasonCode {
  switch (plannerState) {
    case 'appointment_missing_service':
      return 'appointment_missing_service'
    case 'appointment_missing_date':
      return 'appointment_missing_date'
    case 'appointment_missing_time':
      return 'appointment_missing_time'
    case 'availability_available':
      return 'availability_available'
    case 'availability_unavailable':
      return 'availability_unavailable'
    case 'availability_business_closed':
      return 'availability_business_closed'
    case 'availability_missing_information':
      return 'availability_missing_information'
    case 'appointment_complete':
      return 'appointment_complete'
    default:
      return 'action_missing_fields'
  }
}

function resolveBookingDecision(
  request: PreparedInboxDraftRequest,
  receptionistState: ReceptionistConversationState,
  availabilityResult: AvailabilityResult | null,
): InboxDraftDecision {
  const definition = getInboxToolDefinition('prepare_booking_sandbox')
  if (definition.policy === 'deny_ai') {
    return buildDecision('human_handoff', 'tool_policy_denied', {
      handoffRecommended: true,
    })
  }

  const appointmentPreparation = buildBookingPreparation(receptionistState, availabilityResult)
  const reasonCode = reasonFromPlannerState(appointmentPreparation.plannerState)

  if (!appointmentPreparation.eligible) {
    return buildDecision('draft_review', reasonCode, {
      appointmentPreparation,
    })
  }

  if (!isModeCandidateEnabled(request.receptionistConfig.mode)) {
    return buildDecision('draft_review', 'draft_only_mode', {
      appointmentPreparation,
    })
  }

  return buildDecision('action_prepare_candidate', 'availability_available', {
    appointmentPreparation,
    eligibleToolNames: ['prepare_booking_sandbox'],
  })
}

function buildSecondaryActionPreparation(
  receptionistState: ReceptionistConversationState,
  action: Extract<AppointmentPreparationAction, 'reschedule' | 'cancellation'>,
): AppointmentPreparationStatus {
  const completeFields: AppointmentPreparationField[] = []
  const missingFields: AppointmentPreparationField[] = []

  const requestedDate = receptionistState.requestedDate
  const requestedTime = receptionistState.requestedTime
  const currentAppointmentReference = receptionistState.appointmentReference

  if (action === 'reschedule') {
    if (requestedDate) {
      completeFields.push('requested_date')
    } else {
      missingFields.push('requested_date')
    }

    if (requestedTime) {
      completeFields.push('requested_time')
    } else {
      missingFields.push('requested_time')
    }
  }

  if (currentAppointmentReference) {
    completeFields.push('current_appointment_reference')
  } else {
    missingFields.push('current_appointment_reference')
  }

  const requestedToolName = action === 'reschedule'
    ? 'prepare_reschedule'
    : 'prepare_cancellation'
  const preparedToolCall = buildReceptionistPreparedToolCall(receptionistState)

  return {
    action,
    requestedToolName,
    plannerState: 'not_applicable',
    eligible:
      missingFields.length === 0
      && (
        (action === 'reschedule' && preparedToolCall?.name === 'prepare_reschedule')
        || (action === 'cancellation' && preparedToolCall?.name === 'prepare_cancellation')
      ),
    completeFields,
    missingFields,
    nextQuestion: receptionistState.nextQuestion ?? buildNextQuestion(action, missingFields[0]),
    preparedToolCall:
      action === 'reschedule'
        ? preparedToolCall?.name === 'prepare_reschedule'
          ? preparedToolCall
          : null
        : preparedToolCall?.name === 'prepare_cancellation'
          ? preparedToolCall
          : null,
    service: receptionistState.service,
    requestedDate,
    requestedTime,
    appointmentReference: currentAppointmentReference,
    customerName: receptionistState.customerName,
    customerNotes: receptionistState.customerNotes,
    conversationSummary: buildReceptionistConversationSummary(receptionistState),
    availabilityResult: null,
  }
}

function resolveSecondaryActionDecision(
  request: PreparedInboxDraftRequest,
  receptionistState: ReceptionistConversationState,
  action: Extract<AppointmentPreparationAction, 'reschedule' | 'cancellation'>,
): InboxDraftDecision {
  const toolName: AppointmentDecisionToolName = action === 'reschedule'
    ? 'prepare_reschedule'
    : 'prepare_cancellation'
  const definition = getInboxToolDefinition(toolName)

  if (definition.policy === 'deny_ai') {
    return buildDecision('human_handoff', 'tool_policy_denied', {
      handoffRecommended: true,
    })
  }

  const appointmentPreparation = buildSecondaryActionPreparation(receptionistState, action)
  if (!appointmentPreparation.eligible) {
    return buildDecision('draft_review', 'action_missing_fields', {
      appointmentPreparation,
    })
  }

  if (!isModeCandidateEnabled(request.receptionistConfig.mode)) {
    return buildDecision('draft_review', 'draft_only_mode', {
      appointmentPreparation,
    })
  }

  return buildDecision('action_prepare_candidate', 'action_ready', {
    appointmentPreparation,
    eligibleToolNames: [toolName],
  })
}

export function resolveInboxDraftDecision(
  input: ResolveInboxDraftDecisionInput,
): InboxDraftDecision {
  const { request, result } = input
  const receptionistState = result.receptionistState
    ?? request.receptionistState
    ?? resolveDeterministicReceptionistConversationState({
      messages: request.messages,
      serviceCatalog: request.serviceCatalog,
      timezone: request.tenantProfile.timezone,
      conversationMemory: request.conversationMemory,
    })
  const understanding = result.understanding ?? {
    intent: result.intent,
    confidence: result.confidence,
    handoff: result.handoff,
  }
  const effectiveIntent = resolveEffectiveIntent(
    request,
    understanding.intent,
    receptionistState,
  )

  if (request.receptionistConfig.mode === 'disabled') {
    return buildDecision('blocked', 'tenant_mode_disabled')
  }

  if (
    result.confidence === null
    || result.draftText.trim().length === 0
  ) {
    return buildDecision('human_handoff', 'provider_response_incomplete', {
      handoffRecommended: true,
    })
  }

  if (isConversationHumanControlled(request)) {
    return buildDecision('human_handoff', 'human_control_active', {
      handoffRecommended: true,
    })
  }

  if (isAiPaused(request)) {
    return buildDecision('human_handoff', 'ai_paused', {
      handoffRecommended: true,
    })
  }

  if (result.handoff || result.requestedToolCalls.some((toolCall) => toolCall.name === 'request_human_handoff')) {
    return buildDecision('human_handoff', 'provider_requested_handoff', {
      handoffRecommended: true,
    })
  }

  if (HUMAN_HANDOFF_INTENTS.has(effectiveIntent)) {
    return buildDecision('human_handoff', 'intent_requires_human', {
      handoffRecommended: true,
    })
  }

  if (result.confidence < request.receptionistConfig.handoffConfidenceThreshold) {
    return buildDecision('human_handoff', 'confidence_below_threshold', {
      handoffRecommended: true,
    })
  }

  const authoritativeFailure = authoritativeFailureReason(
    result.authoritativeResolution,
  )
  if (authoritativeFailure) {
    return buildDecision('draft_review', authoritativeFailure)
  }

  if (!hasRequiredSourcesForIntent(request, result, effectiveIntent)) {
    return buildDecision('human_handoff', 'missing_required_sources', {
      handoffRecommended: true,
    })
  }

  if (effectiveIntent === 'booking') {
    return resolveBookingDecision(request, receptionistState, result.availabilityResult ?? null)
  }

  if (effectiveIntent === 'reschedule') {
    return resolveSecondaryActionDecision(request, receptionistState, 'reschedule')
  }

  if (effectiveIntent === 'cancel') {
    return resolveSecondaryActionDecision(request, receptionistState, 'cancellation')
  }

  if (LOW_RISK_AUTO_REPLY_INTENTS.has(effectiveIntent)) {
    return resolveAutoReplyDecision(request, result, effectiveIntent)
  }

  return buildDecision('draft_review', 'manual_review_default')
}
