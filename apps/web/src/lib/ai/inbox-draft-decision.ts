import type { InboxToolName } from '../messaging/contracts.ts'
import { getInboxToolDefinition } from '../messaging/tool-registry.ts'
import type {
  AiDraftIntent,
  AiDraftSource,
  InboxAiReceptionistMode,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'
import type { InboxDraftRequestedToolCall } from './inbox-draft-orchestrator-core.ts'

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
  | 'provider_requested_handoff'
  | 'intent_requires_human'
  | 'confidence_below_threshold'
  | 'missing_required_sources'
  | 'human_control_active'
  | 'ai_paused'
  | 'tool_policy_denied'
  | 'draft_only_mode'
  | 'auto_reply_ready'
  | 'auto_reply_policy_blocked'
  | 'auto_reply_intent_not_allowed'
  | 'auto_reply_mutating_tool_requested'
  | 'action_missing_tool'
  | 'action_tool_not_prepare_only'
  | 'action_missing_fields'
  | 'action_ready'
  | 'manual_review_default'

export type AppointmentPreparationAction =
  | 'booking'
  | 'reschedule'
  | 'cancellation'

export type AppointmentPreparationField =
  | 'customer_identity'
  | 'service'
  | 'requested_date'
  | 'requested_time_or_window'
  | 'current_appointment_reference'

export interface AppointmentPreparationStatus {
  action: AppointmentPreparationAction
  requestedToolName: AppointmentDecisionToolName
  eligible: boolean
  completeFields: AppointmentPreparationField[]
  missingFields: AppointmentPreparationField[]
  nextQuestion: string | null
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
  }
}

const DECISION_REASON_SUMMARIES: Record<InboxDraftDecisionReasonCode, string> = {
  tenant_mode_disabled: 'L AI receptionist e disattivata per questo tenant.',
  provider_response_incomplete: 'La risposta AI non e abbastanza completa per essere instradata in sicurezza.',
  provider_requested_handoff: 'Il provider suggerisce esplicitamente il passaggio a un operatore umano.',
  intent_requires_human: 'L intento rilevato richiede presidio umano.',
  confidence_below_threshold: 'La confidenza del provider e troppo bassa per procedere senza handoff.',
  missing_required_sources: 'Le fonti citate non supportano abbastanza la risposta proposta.',
  human_control_active: 'La conversazione e gia sotto controllo umano.',
  ai_paused: 'L AI e gia in pausa per questa conversazione.',
  tool_policy_denied: 'Il tool richiesto non e autorizzato per questa modalita.',
  draft_only_mode: 'Questo tenant e in modalita draft-only: la bozza resta sempre sotto revisione umana.',
  auto_reply_ready: 'La risposta soddisfa i criteri conservativi per un futuro FAQ automatico supervisionato.',
  auto_reply_policy_blocked: 'La risposta non soddisfa i criteri conservativi per un FAQ candidate.',
  auto_reply_intent_not_allowed: 'L intento non e abilitato per il routing FAQ supervisionato di questo tenant.',
  auto_reply_mutating_tool_requested: 'La risposta richiede tool o conferme incompatibili con un FAQ candidate.',
  action_missing_tool: 'La richiesta richiede un tool di preparazione non disponibile o non coerente.',
  action_tool_not_prepare_only: 'Il tool richiesto non e un prepare_* sicuro per questa fase.',
  action_missing_fields: 'Mancano dati obbligatori prima di preparare un azione di business.',
  action_ready: 'La richiesta contiene i dati minimi per preparare un azione senza eseguirla.',
  manual_review_default: 'La bozza resta in revisione umana conservativa.',
}

function normalizeTranscript(messages: PreparedInboxDraftRequest['messages']): string {
  return messages
    .map((message) => message.text)
    .join('\n')
    .toLowerCase()
}

function hasKnowledgeSource(
  sources: AiDraftSource[],
  prefix: string,
): boolean {
  return sources.some((source) => source.ref.startsWith(prefix))
}

function hasRequiredSourcesForIntent(
  request: PreparedInboxDraftRequest,
  result: ResolveInboxDraftDecisionInput['result'],
): boolean {
  if (result.citedSources.length === 0) {
    return false
  }

  const sourceRefs = new Set(request.sources.map((source) => source.ref))
  if (result.citedSources.some((source) => !sourceRefs.has(source.ref))) {
    return false
  }

  switch (result.intent) {
    case 'pricing':
      return hasKnowledgeSource(result.citedSources, 'service:')
    case 'opening_hours':
      return hasKnowledgeSource(result.citedSources, 'working_hours:')
    case 'faq':
      return result.citedSources.some((source) =>
        source.kind === 'knowledge'
        || source.kind === 'policy'
        || source.kind === 'tool_result',
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

function firstRequestedTool(
  requestedToolCalls: InboxDraftRequestedToolCall[],
  toolName: AppointmentDecisionToolName,
): InboxDraftRequestedToolCall | null {
  return requestedToolCalls.find((toolCall) => toolCall.name === toolName) ?? null
}

function detectRequestedService(request: PreparedInboxDraftRequest): string | null {
  const transcript = normalizeTranscript(request.messages)
  const catalog = [...request.serviceCatalog].sort(
    (left, right) => right.name.length - left.name.length,
  )

  for (const service of catalog) {
    const normalizedName = service.name.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const pattern = new RegExp(`(^|[^a-z0-9])${normalizedName}([^a-z0-9]|$)`, 'i')
    if (pattern.test(transcript)) {
      return service.name
    }
  }

  return null
}

function readLastMatch(
  pattern: RegExp,
  text: string,
): string | null {
  const matches = [...text.matchAll(pattern)]
  const lastMatch = matches.at(-1)
  return lastMatch?.[1] ?? null
}

function detectRequestedDate(
  request: PreparedInboxDraftRequest,
  action: AppointmentPreparationAction,
): string | null {
  const transcript = normalizeTranscript(request.messages)
  const pattern = /\b(oggi|domani|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?)\b/gi
  const match = action === 'reschedule'
    ? readLastMatch(pattern, transcript)
    : transcript.match(pattern)?.[0] ?? null

  return match
}

function detectRequestedTimeOrWindow(
  request: PreparedInboxDraftRequest,
  action: AppointmentPreparationAction,
): string | null {
  const transcript = normalizeTranscript(request.messages)
  const explicitTimePattern = /\b(?:alle|per le|verso le)\s*(\d{1,2}(?::\d{2})?)\b/gi
  const explicitTime = action === 'reschedule'
    ? readLastMatch(explicitTimePattern, transcript)
    : transcript.match(/\b(?:alle|per le|verso le)\s*(\d{1,2}(?::\d{2})?)\b/i)?.[1] ?? null

  if (explicitTime) {
    return explicitTime
  }

  const windowPattern = /\b(mattina|pomeriggio|sera|prima mattina|tarda mattinata)\b/gi
  return action === 'reschedule'
    ? readLastMatch(windowPattern, transcript)
    : transcript.match(windowPattern)?.[0] ?? null
}

function detectCurrentAppointmentReference(request: PreparedInboxDraftRequest): string | null {
  const transcript = normalizeTranscript(request.messages)
  const match = transcript.match(
    /\b(?:appuntamento|prenotazione)(?:\s+(?:di|del|per))?\s+(oggi|domani|dopodomani|lunedi|martedi|mercoledi|giovedi|venerdi|sabato|domenica|\d{1,2}[\/.-]\d{1,2}(?:[\/.-]\d{2,4})?(?:\s+alle\s+\d{1,2}(?::\d{2})?)?)\b/i,
  )

  return match?.[1] ?? null
}

function buildNextQuestion(
  action: AppointmentPreparationAction,
  missingField: AppointmentPreparationField | undefined,
): string | null {
  switch (missingField) {
    case 'service':
      return 'Quale servizio devo considerare per la richiesta?'
    case 'requested_date':
      return action === 'booking'
        ? 'Per quale giorno vorresti fissare l appuntamento?'
        : 'Per quale giorno va preparata la modifica?'
    case 'requested_time_or_window':
      return action === 'cancellation'
        ? null
        : 'Hai gia una fascia oraria o un orario preferito?'
    case 'current_appointment_reference':
      return 'Mi indichi il riferimento dell appuntamento da modificare o cancellare?'
    case 'customer_identity':
      return 'Serve verificare il cliente associato a questa conversazione prima di procedere.'
    default:
      return null
  }
}

function buildAppointmentPreparationStatus(
  request: PreparedInboxDraftRequest,
  requestedToolName: AppointmentDecisionToolName,
): AppointmentPreparationStatus {
  const action: AppointmentPreparationAction =
    requestedToolName === 'prepare_appointment'
      ? 'booking'
      : requestedToolName === 'prepare_reschedule'
        ? 'reschedule'
        : 'cancellation'

  const completeFields: AppointmentPreparationField[] = []
  const missingFields: AppointmentPreparationField[] = []

  if (request.conversationState.clientId) {
    completeFields.push('customer_identity')
  } else {
    missingFields.push('customer_identity')
  }

  if (action === 'booking') {
    if (detectRequestedService(request)) {
      completeFields.push('service')
    } else {
      missingFields.push('service')
    }
  }

  if (action === 'booking' || action === 'reschedule') {
    if (detectRequestedDate(request, action)) {
      completeFields.push('requested_date')
    } else {
      missingFields.push('requested_date')
    }
  }

  if (action === 'booking' || action === 'reschedule') {
    if (detectRequestedTimeOrWindow(request, action)) {
      completeFields.push('requested_time_or_window')
    } else {
      missingFields.push('requested_time_or_window')
    }
  }

  if (action === 'reschedule' || action === 'cancellation') {
    if (detectCurrentAppointmentReference(request)) {
      completeFields.push('current_appointment_reference')
    } else {
      missingFields.push('current_appointment_reference')
    }
  }

  return {
    action,
    requestedToolName,
    eligible: missingFields.length === 0,
    completeFields,
    missingFields,
    nextQuestion: buildNextQuestion(action, missingFields[0]),
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

  if (!request.receptionistConfig.allowedAutonomousIntents.includes(result.intent)) {
    return buildDecision('draft_review', 'auto_reply_intent_not_allowed')
  }

  if ((result.confidence ?? 0) < request.receptionistConfig.autoReplyConfidenceThreshold) {
    return buildDecision('draft_review', 'auto_reply_policy_blocked')
  }

  return buildDecision('auto_reply_candidate', 'auto_reply_ready')
}

function resolveAppointmentDecision(
  request: PreparedInboxDraftRequest,
  result: ResolveInboxDraftDecisionInput['result'],
): InboxDraftDecision {
  const expectedToolName: AppointmentDecisionToolName =
    result.intent === 'appointment_booking'
      ? 'prepare_appointment'
      : result.intent === 'appointment_change'
        ? 'prepare_reschedule'
        : 'prepare_cancellation'

  const requestedTool = firstRequestedTool(result.requestedToolCalls, expectedToolName)
  if (!requestedTool) {
    return buildDecision('draft_review', 'action_missing_tool')
  }

  if (requestedTool.policy === 'deny_ai') {
    return buildDecision('human_handoff', 'tool_policy_denied', {
      handoffRecommended: true,
    })
  }

  const definition = getInboxToolDefinition(requestedTool.name)
  if (definition.category !== 'prepare_mutation') {
    return buildDecision('draft_review', 'action_tool_not_prepare_only')
  }

  const appointmentPreparation = buildAppointmentPreparationStatus(
    request,
    expectedToolName,
  )
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
    eligibleToolNames: [requestedTool.name],
  })
}

export function resolveInboxDraftDecision(
  input: ResolveInboxDraftDecisionInput,
): InboxDraftDecision {
  const { request, result } = input

  if (request.receptionistConfig.mode === 'disabled') {
    return buildDecision('blocked', 'tenant_mode_disabled')
  }

  if (
    result.confidence === null
    || result.draftText.trim().length === 0
    || result.citedSources.length === 0
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

  if (HUMAN_HANDOFF_INTENTS.has(result.intent)) {
    return buildDecision('human_handoff', 'intent_requires_human', {
      handoffRecommended: true,
    })
  }

  if (result.confidence < request.receptionistConfig.handoffConfidenceThreshold) {
    return buildDecision('human_handoff', 'confidence_below_threshold', {
      handoffRecommended: true,
    })
  }

  if (!hasRequiredSourcesForIntent(request, result)) {
    return buildDecision('human_handoff', 'missing_required_sources', {
      handoffRecommended: true,
    })
  }

  if (result.intent === 'appointment_booking'
    || result.intent === 'appointment_change'
    || result.intent === 'appointment_cancel') {
    return resolveAppointmentDecision(request, result)
  }

  if (LOW_RISK_AUTO_REPLY_INTENTS.has(result.intent)) {
    return resolveAutoReplyDecision(request, result)
  }

  return buildDecision('draft_review', 'manual_review_default')
}
