import type { Json } from '@/types'
import { getInboxToolDefinition } from '../messaging/tool-registry.ts'
import type { ToolPolicyDecision } from '../messaging/contracts.ts'
import {
  AI_DRAFT_INTENTS,
  type AvailabilityResult,
  type AiConversationUnderstanding,
  type AiDraftIntent,
  type AiDraftProvider,
  type AiDraftSource,
  type AiDraftToolCall,
  type PreparedInboxDraftRequest,
  type ReceptionistConversationState,
} from './draft-provider.ts'
import type { AvailabilityGateway } from './availability-gateway.ts'
import {
  resolveInboxDraftDecision,
  type InboxDraftDecisionKind,
  type InboxDraftDecisionReasonCode,
  type InboxDraftDecision,
} from './inbox-draft-decision.ts'
import { InboxDraftPreparationError } from './inbox-draft-context-core.ts'
import {
  resolveDeterministicFaqDraft,
  type DeterministicFaqResolution,
} from './inbox-deterministic-faq-resolver.ts'
import { resolveBookingAvailabilityCheck } from './inbox-availability-resolution.ts'
import { resolveReceptionistConversationState } from './receptionist-conversation-state.ts'

const MAX_DRAFT_TEXT_LENGTH = 4096
const MAX_INTERNAL_REASONING_LENGTH = 640
const AI_DRAFT_INTENT_SET = new Set<string>(AI_DRAFT_INTENTS)

const POLICY_PRIORITY: Record<ToolPolicyDecision, number> = {
  allow: 0,
  ask_customer: 1,
  ask_staff: 2,
  ask_owner: 3,
  deny_ai: 4,
}

export type InboxDraftRuntimeErrorCode =
  | 'MALFORMED_PROVIDER_RESPONSE'
  | 'PROVIDER_FAILED'
  | 'RUN_PERSIST_FAILED'
  | InboxDraftPreparationError['code']

export interface InboxDraftRequestedToolCall extends AiDraftToolCall {
  policy: ToolPolicyDecision
  requiresCustomerConfirmation: boolean
  requiresStaffApproval: boolean
}

export interface GeneratedInboxDraft {
  providerId: string
  providerRunId: string | null
  promptId: string
  promptVersion: string
  draftText: string
  confidence: number | null
  intent: AiDraftIntent
  handoff: boolean
  understanding: AiConversationUnderstanding
  internalReasoning: string | null
  citedSources: AiDraftSource[]
  requestedToolCalls: InboxDraftRequestedToolCall[]
  receptionistState: ReceptionistConversationState
  availabilityResult: AvailabilityResult | null
  decision: InboxDraftDecision
  authoritativeResolution: DeterministicFaqResolution | null
  usedAuthoritativeKnowledge: boolean
  runId: string
}

type NormalizedGeneratedInboxDraft = Omit<
  GeneratedInboxDraft,
  | 'providerId'
  | 'promptId'
  | 'promptVersion'
  | 'runId'
  | 'decision'
  | 'authoritativeResolution'
  | 'usedAuthoritativeKnowledge'
>

export interface GenerateInboxDraftCoreDeps {
  loadDraftRequest(
    tenantId: string,
    conversationId: string,
  ): Promise<PreparedInboxDraftRequest>
  provider: Pick<AiDraftProvider, 'providerId'> & {
    generateDraft(input: PreparedInboxDraftRequest): Promise<unknown>
  }
  availabilityGateway: AvailabilityGateway
  createRun(input: {
    tenantId: string
    conversationId: string
    messageId: string | null
    providerId: string
    promptId: string
    promptVersion: string
    model: string
    inputContext: Json
  }): Promise<{ runId: string }>
  completeRun(input: {
    runId: string
    tenantId: string
    messageId: string | null
    providerId: string
    promptId: string
    promptVersion: string
    intent: AiDraftIntent
    confidence: number | null
    decisionKind: InboxDraftDecisionKind
    reasonCode: InboxDraftDecisionReasonCode
    deterministicResolver: string | null
    usedAuthoritativeKnowledge: boolean
    citedSourceSummary: Array<Pick<AiDraftSource, 'kind' | 'label'>>
    outputSummary: string
    inputContext: Json
    finalPolicyDecision: ToolPolicyDecision
    handoffReason: string | null
  }): Promise<void>
  failRun(input: {
    runId: string
    tenantId: string
    messageId: string | null
    providerId: string | null
    promptId: string | null
    promptVersion: string | null
    decisionKind: InboxDraftDecisionKind
    reasonCode: InboxDraftDecisionReasonCode
    errorCategory: string
    errorMessage: string
    inputContext: Json
  }): Promise<void>
}

export class InboxDraftRuntimeError extends Error {
  code: InboxDraftRuntimeErrorCode
  httpStatus: number
  publicMessage: string

  constructor(
    code: InboxDraftRuntimeErrorCode,
    httpStatus: number,
    publicMessage: string,
  ) {
    super(publicMessage)
    this.name = 'InboxDraftRuntimeError'
    this.code = code
    this.httpStatus = httpStatus
    this.publicMessage = publicMessage
  }
}

export function isInboxDraftRuntimeError(
  error: unknown,
): error is InboxDraftRuntimeError {
  return error instanceof InboxDraftRuntimeError
}

function toPreparationRuntimeError(
  error: InboxDraftPreparationError,
): InboxDraftRuntimeError {
  switch (error.code) {
    case 'CONVERSATION_NOT_FOUND':
      return new InboxDraftRuntimeError(error.code, 404, 'Conversazione non trovata.')
    case 'TENANT_NOT_FOUND':
      return new InboxDraftRuntimeError(error.code, 404, 'Tenant non trovato.')
    case 'CROSS_TENANT_RESOURCE':
      return new InboxDraftRuntimeError(error.code, 404, 'Conversazione non trovata.')
    case 'DRAFT_CONTEXT_QUERY_FAILED':
    default:
      return new InboxDraftRuntimeError(
        error.code,
        500,
        'Impossibile preparare il contesto della bozza AI.',
      )
  }
}

function toJsonRecord(value: Record<string, unknown>): Json {
  return JSON.parse(JSON.stringify(value)) as Json
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBoundedNullableString(
  value: unknown,
  maxLength: number,
): string | null {
  if (value == null) return null
  if (typeof value !== 'string') {
    malformedProviderResponse()
  }

  const normalized = value.trim()
  if (normalized.length === 0 || normalized.length > maxLength) {
    malformedProviderResponse()
  }

  return normalized
}

function parseStructuredToolCalls(
  value: unknown,
): Array<{ name: string; arguments: Record<string, unknown> }> {
  if (!Array.isArray(value) || value.length > 6) {
    malformedProviderResponse()
  }

  return value.map((entry) => {
    if (!isRecord(entry) || typeof entry.name !== 'string') {
      malformedProviderResponse()
    }

    const argumentsValue = entry.arguments ?? {}
    if (!isRecord(argumentsValue)) {
      malformedProviderResponse()
    }

    return {
      name: entry.name.trim(),
      arguments: argumentsValue,
    }
  })
}

function parseStructuredUnderstanding(
  value: unknown,
): AiConversationUnderstanding {
  if (!isRecord(value)) {
    malformedProviderResponse()
  }

  const confidence =
    value.confidence === null
      ? null
      : typeof value.confidence === 'number'
          && Number.isFinite(value.confidence)
          && value.confidence >= 0
          && value.confidence <= 1
        ? value.confidence
        : malformedProviderResponse()

  if (typeof value.intent !== 'string' || !AI_DRAFT_INTENT_SET.has(value.intent)) {
    malformedProviderResponse()
  }

  if (typeof value.handoff !== 'boolean') {
    malformedProviderResponse()
  }

  const entities = value.entities
  if (!isRecord(entities)) {
    malformedProviderResponse()
  }

  const corrections = value.corrections
  if (!isRecord(corrections)) {
    malformedProviderResponse()
  }

  const citedSourcesRaw = value.citedSources ?? value.cited_sources
  if (!Array.isArray(citedSourcesRaw) || citedSourcesRaw.some((entry) => typeof entry !== 'string')) {
    malformedProviderResponse()
  }

  return {
    intent: value.intent as AiDraftIntent,
    confidence,
    handoff: value.handoff,
    entities: {
      service: readBoundedNullableString(entities.service, 120),
      requestedDate: readBoundedNullableString(entities.requestedDate, 20),
      requestedTime: readBoundedNullableString(entities.requestedTime, 20),
      appointmentReference: readBoundedNullableString(entities.appointmentReference, 120),
      customerName: readBoundedNullableString(entities.customerName, 80),
      customerNotes: readBoundedNullableString(entities.customerNotes, 220),
    },
    corrections: {
      replacesService:
        typeof corrections.replacesService === 'boolean'
          ? corrections.replacesService
          : malformedProviderResponse(),
      replacesDate:
        typeof corrections.replacesDate === 'boolean'
          ? corrections.replacesDate
          : malformedProviderResponse(),
      replacesTime:
        typeof corrections.replacesTime === 'boolean'
          ? corrections.replacesTime
          : malformedProviderResponse(),
    },
    citedSources: citedSourcesRaw.map((source) => source.trim()).filter(Boolean),
    requestedToolCalls: parseStructuredToolCalls(
      value.requestedToolCalls ?? value.requested_tools ?? [],
    ),
  }
}

interface ParsedProviderResponse {
  draftText: string
  understanding: AiConversationUnderstanding
  internalReasoning: string | null
  providerRunId: string | null
}

function malformedProviderResponse(): never {
  throw new InboxDraftRuntimeError(
    'MALFORMED_PROVIDER_RESPONSE',
    502,
    'La risposta del provider AI non e valida.',
  )
}

function parseProviderResponse(payload: unknown): ParsedProviderResponse {
  if (!isRecord(payload)) {
    malformedProviderResponse()
  }

  if (typeof payload.draftText !== 'string') {
    malformedProviderResponse()
  }

  const internalReasoning =
    payload.internalReasoning === null
      ? null
      : typeof payload.internalReasoning === 'string'
        ? payload.internalReasoning.trim()
        : malformedProviderResponse()

  if (
    internalReasoning !== null
    && (internalReasoning.length === 0 || internalReasoning.length > MAX_INTERNAL_REASONING_LENGTH)
  ) {
    malformedProviderResponse()
  }

  const providerRunId =
    payload.providerRunId == null
      ? null
      : typeof payload.providerRunId === 'string'
        ? payload.providerRunId.trim()
        : malformedProviderResponse()

  if (providerRunId !== null && providerRunId.length === 0) {
    malformedProviderResponse()
  }

  return {
    draftText: payload.draftText,
    understanding: parseStructuredUnderstanding(payload.understanding),
    internalReasoning,
    providerRunId,
  }
}

function normalizeDraftText(value: string): string {
  const normalized = value.trim()

  if (normalized.length === 0 || normalized.length > MAX_DRAFT_TEXT_LENGTH) {
    throw new InboxDraftRuntimeError(
      'MALFORMED_PROVIDER_RESPONSE',
      502,
      'La bozza AI ricevuta non e valida.',
    )
  }

  return normalized
}

function normalizeCitedSources(
  citedSourceRefs: string[],
  request: PreparedInboxDraftRequest,
): AiDraftSource[] {
  const sourceByRef = new Map(
    request.sources.map((source) => [source.ref, source] as const),
  )
  const normalized: AiDraftSource[] = []

  for (const ref of citedSourceRefs) {
    const source = sourceByRef.get(ref)
    if (!source) continue
    if (normalized.some((entry) => entry.ref === source.ref)) continue
    normalized.push(source)
  }

  if (normalized.length === 0) {
    throw new InboxDraftRuntimeError(
      'MALFORMED_PROVIDER_RESPONSE',
      502,
      'La bozza AI non contiene fonti tracciabili valide.',
    )
  }

  return normalized
}

function normalizeRequestedToolCalls(
  requestedToolCalls: Array<{ name: string; arguments: Record<string, unknown> }>,
  request: PreparedInboxDraftRequest,
): InboxDraftRequestedToolCall[] {
  function sanitizeToolArguments(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((entry) => sanitizeToolArguments(entry))
    }

    if (!isRecord(value)) {
      return value
    }

    const sanitizedEntries = Object.entries(value).flatMap(([key, nestedValue]) => {
      if (
        key === 'tenant_id'
        || key === 'tenantId'
        || key === 'auto_send'
        || key === 'autoSend'
        || key === 'send_now'
        || key === 'sendNow'
      ) {
        return []
      }

      return [[key, sanitizeToolArguments(nestedValue)] as const]
    })

    return Object.fromEntries(sanitizedEntries)
  }

  const normalized: InboxDraftRequestedToolCall[] = []

  for (const toolCall of requestedToolCalls) {
    const matchedToolName = request.allowedTools.find(
      (allowedToolName) => allowedToolName === toolCall.name,
    )
    if (!matchedToolName) continue
    if (normalized.some((entry) => entry.name === matchedToolName)) continue

    const definition = getInboxToolDefinition(matchedToolName)
    normalized.push({
      name: matchedToolName,
      arguments: sanitizeToolArguments(toolCall.arguments) as Record<string, unknown>,
      policy: definition.policy,
      requiresCustomerConfirmation: definition.requiresCustomerConfirmation,
      requiresStaffApproval: definition.requiresStaffApproval,
    })
  }

  return normalized
}

export function resolveInboxDraftFinalPolicyDecision(
  requestedToolCalls: InboxDraftRequestedToolCall[],
): ToolPolicyDecision {
  return requestedToolCalls.reduce<ToolPolicyDecision>((current, toolCall) => {
    if (POLICY_PRIORITY[toolCall.policy] > POLICY_PRIORITY[current]) {
      return toolCall.policy
    }

    return current
  }, 'allow')
}

function buildRunInputContext(
  request: PreparedInboxDraftRequest,
  result?: {
    confidence: number | null
    intent: AiDraftIntent
    handoff: boolean
    understanding: AiConversationUnderstanding
    internalReasoning: string | null
    citedSources: AiDraftSource[]
    providerRunId: string | null
    requestedToolCalls: InboxDraftRequestedToolCall[]
    receptionistState: ReceptionistConversationState
    availabilityResult: AvailabilityResult | null
    availabilityGatewayId: string | null
    decision: InboxDraftDecision
    authoritativeResolution: DeterministicFaqResolution | null
  },
): Json {
  return toJsonRecord({
    prompt: {
      id: request.promptId,
      version: request.promptVersion,
    },
    runtime: {
      receptionist_mode: request.receptionistConfig.mode,
      confidence_thresholds: {
        auto_reply: request.receptionistConfig.autoReplyConfidenceThreshold,
        handoff: request.receptionistConfig.handoffConfidenceThreshold,
      },
      allowed_autonomous_intents: request.receptionistConfig.allowedAutonomousIntents,
      conversation_state: {
        status: request.conversationState.status,
        ownership_mode: request.conversationState.ownershipMode,
        ai_paused: request.conversationState.aiPausedAt !== null,
        known_customer: request.conversationState.clientId !== null,
      },
      receptionist_state: request.receptionistState,
      tenant_profile: request.tenantProfile,
    },
    request: {
      allowed_tools: request.allowedTools,
      context_sections: request.contextSections,
      messages: request.messages,
      sources: request.sources,
    },
    response: result
      ? {
          confidence: result.confidence,
          cited_source_refs: result.citedSources.map((source) => source.ref),
          handoff: result.handoff,
          intent: result.intent,
          understanding: result.understanding,
          internal_reasoning: result.internalReasoning,
          provider_run_id: result.providerRunId,
          receptionist_state: result.receptionistState,
          availability: {
            gateway_id: result.availabilityGatewayId,
            result: result.availabilityResult,
          },
          requested_tool_calls: result.requestedToolCalls.map((toolCall) => ({
            name: toolCall.name,
            policy: toolCall.policy,
            arguments: toolCall.arguments,
          })),
          authoritative_resolution: result.authoritativeResolution
            ? {
                attempted: result.authoritativeResolution.attempted,
                resolved: result.authoritativeResolution.resolved,
                resolver: result.authoritativeResolution.resolver,
                reason_code: result.authoritativeResolution.reasonCode,
                operator_note: result.authoritativeResolution.operatorNote,
                missing_information: result.authoritativeResolution.missingInformation,
                ambiguous_information: result.authoritativeResolution.ambiguousInformation,
                supporting_source_refs: result.authoritativeResolution.supportingSources.map(
                  (source) => source.ref,
                ),
                used_authoritative_knowledge: result.authoritativeResolution.usedAuthoritativeKnowledge,
              }
            : null,
          decision: {
            kind: result.decision.kind,
            reason_code: result.decision.reasonCode,
            handoff_recommended: result.decision.handoffRecommended,
            eligible_tool_names: result.decision.eligibleToolNames,
            missing_required_fields: result.decision.missingRequiredFields,
            appointment_preparation: result.decision.appointmentPreparation,
          },
        }
      : null,
  })
}

function normalizeProviderResponse(
  payload: unknown,
  request: PreparedInboxDraftRequest,
): NormalizedGeneratedInboxDraft {
  const parsed = parseProviderResponse(payload)
  const draftText = normalizeDraftText(parsed.draftText)
  const citedSources = normalizeCitedSources(parsed.understanding.citedSources, request)
  const requestedToolCalls = normalizeRequestedToolCalls(
    parsed.understanding.requestedToolCalls,
    request,
  )
  const receptionistState = resolveReceptionistConversationState({
    messages: request.messages,
    serviceCatalog: request.serviceCatalog,
    timezone: request.tenantProfile.timezone,
    conversationMemory: request.conversationMemory,
    understanding: parsed.understanding,
  })

  return {
    confidence: parsed.understanding.confidence,
    intent: parsed.understanding.intent,
    handoff: parsed.understanding.handoff,
    understanding: parsed.understanding,
    internalReasoning: parsed.internalReasoning,
    providerRunId: parsed.providerRunId,
    draftText,
    citedSources,
    requestedToolCalls,
    receptionistState,
    availabilityResult: null,
  }
}

function mergeCitedSources(...groups: AiDraftSource[][]): AiDraftSource[] {
  const merged: AiDraftSource[] = []

  for (const group of groups) {
    for (const source of group) {
      if (merged.some((entry) => entry.ref === source.ref)) continue
      merged.push(source)
    }
  }

  return merged
}

function buildAuthoritativeFallbackDraft(
  resolution: DeterministicFaqResolution,
): string {
  switch (resolution.reasonCode) {
    case 'pricing_service_missing':
    case 'pricing_service_price_missing':
    case 'pricing_catalog_empty':
      return 'Grazie, verifico il prezzo corretto con lo staff e ti confermo appena possibile.'
    case 'opening_hours_missing':
      return 'Grazie, verifico gli orari aggiornati del salone con lo staff e ti confermo appena possibile.'
    case 'custom_faq_missing':
    case 'custom_faq_ambiguous':
      return 'Grazie, verifico questo dettaglio con lo staff e ti confermo appena possibile.'
    default:
      return 'Grazie, verifico il dettaglio con lo staff prima di rispondere.'
  }
}

function applyAuthoritativeResolution(
  request: PreparedInboxDraftRequest,
  normalized: NormalizedGeneratedInboxDraft,
): {
  result: NormalizedGeneratedInboxDraft
  authoritativeResolution: DeterministicFaqResolution | null
} {
  const authoritativeResolution = resolveDeterministicFaqDraft({
    request,
    intent: normalized.intent,
  })

  if (!authoritativeResolution.attempted) {
    return {
      result: normalized,
      authoritativeResolution: null,
    }
  }

  if (authoritativeResolution.resolved && authoritativeResolution.answerText) {
    return {
      result: {
        ...normalized,
        draftText: authoritativeResolution.answerText,
        understanding: {
          ...normalized.understanding,
          citedSources: authoritativeResolution.supportingSources.map((source) => source.ref),
          requestedToolCalls: [],
        },
        citedSources: authoritativeResolution.supportingSources,
        requestedToolCalls: [],
      },
      authoritativeResolution,
    }
  }

  return {
    result: {
      ...normalized,
      draftText: buildAuthoritativeFallbackDraft(authoritativeResolution),
      understanding: {
        ...normalized.understanding,
        citedSources: authoritativeResolution.supportingSources.map((source) => source.ref),
        requestedToolCalls: [],
      },
      citedSources: authoritativeResolution.supportingSources,
      requestedToolCalls: [],
    },
    authoritativeResolution,
  }
}

async function applyAvailabilityResolution(
  request: PreparedInboxDraftRequest,
  normalized: NormalizedGeneratedInboxDraft,
  availabilityGateway: AvailabilityGateway,
): Promise<{
  result: NormalizedGeneratedInboxDraft
  availabilityGatewayId: string | null
}> {
  if (normalized.receptionistState.activeGoal !== 'booking') {
    return {
      result: normalized,
      availabilityGatewayId: null,
    }
  }

  try {
    const availabilityCheck = await resolveBookingAvailabilityCheck({
      request,
      receptionistState: normalized.receptionistState,
      availabilityGateway,
    })

    if (!availabilityCheck.checked) {
      return {
        result: normalized,
        availabilityGatewayId: null,
      }
    }

    const citedSources = mergeCitedSources(
      normalized.citedSources,
      availabilityCheck.supportingSources,
    )

    return {
      result: {
        ...normalized,
        draftText: availabilityCheck.draftText ?? normalized.draftText,
        understanding: {
          ...normalized.understanding,
          citedSources: citedSources.map((source) => source.ref),
        },
        citedSources,
        availabilityResult: availabilityCheck.availabilityResult,
      },
      availabilityGatewayId: availabilityCheck.gatewayId,
    }
  } catch {
    const bookingState = normalized.receptionistState
    const bookingLooksComplete =
      bookingState.activeGoal === 'booking'
      && bookingState.service !== null
      && bookingState.requestedDate !== null
      && bookingState.requestedTime !== null

    return {
      result: bookingLooksComplete
        ? {
            ...normalized,
            draftText:
              'Controllo la disponibilita e preparo la richiesta appena verifico lo slot corretto.',
            availabilityResult: null,
          }
        : normalized,
      availabilityGatewayId: null,
    }
  }
}

function resolveFailureReasonCode(
  error: unknown,
  runtimeError: InboxDraftRuntimeError,
): InboxDraftDecisionReasonCode {
  if (runtimeError.code === 'MALFORMED_PROVIDER_RESPONSE') {
    return 'provider_malformed_response'
  }

  if (
    runtimeError.code === 'PROVIDER_FAILED'
    && error instanceof Error
    && /timed?\s*out|timeout/i.test(error.message)
  ) {
    return 'provider_timeout'
  }

  return 'provider_failed'
}

export async function generateInboxDraftCore(
  input: {
    tenantId: string
    conversationId: string
    messageId?: string | null
  },
  deps: GenerateInboxDraftCoreDeps,
): Promise<GeneratedInboxDraft> {
  let request: PreparedInboxDraftRequest
  try {
    request = await deps.loadDraftRequest(input.tenantId, input.conversationId)
  } catch (error) {
    if (error instanceof InboxDraftPreparationError) {
      throw toPreparationRuntimeError(error)
    }

    throw error
  }

  const initialInputContext = buildRunInputContext(request)
  let runId: string

  try {
    const run = await deps.createRun({
      tenantId: input.tenantId,
      conversationId: input.conversationId,
      messageId: input.messageId ?? null,
      providerId: deps.provider.providerId,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      model: deps.provider.providerId,
      inputContext: initialInputContext,
    })
    runId = run.runId
  } catch {
    throw new InboxDraftRuntimeError(
      'RUN_PERSIST_FAILED',
      500,
      'Impossibile registrare il run della bozza AI.',
    )
  }

  try {
    const providerPayload = await deps.provider.generateDraft(request)
    const normalized = normalizeProviderResponse(providerPayload, request)
    const authoritative = applyAuthoritativeResolution(request, normalized)
    const availability = await applyAvailabilityResolution(
      request,
      authoritative.result,
      deps.availabilityGateway,
    )
    const decision = resolveInboxDraftDecision({
      request,
      result: {
        ...availability.result,
        authoritativeResolution: authoritative.authoritativeResolution,
      },
    })
    const finalPolicyDecision = resolveInboxDraftFinalPolicyDecision(
      availability.result.requestedToolCalls,
    )
    const completedInputContext = buildRunInputContext(request, {
      confidence: availability.result.confidence,
      intent: availability.result.intent,
      handoff: availability.result.handoff,
      understanding: availability.result.understanding,
      internalReasoning: availability.result.internalReasoning,
      citedSources: availability.result.citedSources,
      providerRunId: availability.result.providerRunId,
      receptionistState: availability.result.receptionistState,
      availabilityResult: availability.result.availabilityResult,
      availabilityGatewayId: availability.availabilityGatewayId,
      requestedToolCalls: availability.result.requestedToolCalls,
      decision,
      authoritativeResolution: authoritative.authoritativeResolution,
    })

    await deps.completeRun({
      runId,
      tenantId: input.tenantId,
      messageId: input.messageId ?? null,
      providerId: deps.provider.providerId,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      intent: availability.result.intent,
      confidence: availability.result.confidence,
      decisionKind: decision.kind,
      reasonCode: decision.reasonCode,
      deterministicResolver: authoritative.authoritativeResolution?.resolver ?? null,
      usedAuthoritativeKnowledge:
        authoritative.authoritativeResolution?.usedAuthoritativeKnowledge ?? false,
      citedSourceSummary: availability.result.citedSources.map((source) => ({
        kind: source.kind,
        label: source.label,
      })),
      outputSummary: availability.result.draftText,
      inputContext: completedInputContext,
      finalPolicyDecision,
      handoffReason: decision.handoffRecommended ? decision.reasonCode : null,
    })

    return {
      runId,
      providerId: deps.provider.providerId,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      decision,
      authoritativeResolution: authoritative.authoritativeResolution,
      usedAuthoritativeKnowledge:
        authoritative.authoritativeResolution?.usedAuthoritativeKnowledge ?? false,
      ...availability.result,
    }
  } catch (error) {
    const runtimeError =
      error instanceof InboxDraftRuntimeError
        ? error
        : new InboxDraftRuntimeError(
            'PROVIDER_FAILED',
            502,
            'Generazione bozza AI non riuscita.',
          )
    const reasonCode = resolveFailureReasonCode(error, runtimeError)

    await deps.failRun({
      runId,
      tenantId: input.tenantId,
      messageId: input.messageId ?? null,
      providerId: deps.provider.providerId,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      decisionKind: 'blocked',
      reasonCode,
      errorCategory: runtimeError.code,
      errorMessage: error instanceof Error ? error.message : runtimeError.publicMessage,
      inputContext: initialInputContext,
    })

    throw runtimeError
  }
}
