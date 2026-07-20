import { z } from 'zod'

import type { Json } from '@/types'
import { getInboxToolDefinition } from '../messaging/tool-registry.ts'
import type { ToolPolicyDecision } from '../messaging/contracts.ts'
import {
  AI_DRAFT_INTENTS,
  type AiDraftIntent,
  type AiDraftProvider,
  type AiDraftSource,
  type AiDraftToolCall,
  type PreparedInboxDraftRequest,
} from './draft-provider.ts'
import {
  resolveInboxDraftDecision,
  type InboxDraftDecision,
} from './inbox-draft-decision.ts'
import { InboxDraftPreparationError } from './inbox-draft-context-core.ts'

const MAX_DRAFT_TEXT_LENGTH = 4096

const providerResponseSchema = z.object({
  draftText: z.string(),
  confidence: z.number().min(0).max(1).nullable(),
  intent: z.enum(AI_DRAFT_INTENTS),
  handoff: z.boolean(),
  internalReasoning: z.string().trim().min(1).max(640).nullable(),
  citedSources: z.array(z.string()).default([]),
  requestedToolCalls: z.array(z.object({
    name: z.string(),
    arguments: z.record(z.string(), z.unknown()).default({}),
  })).default([]),
  providerRunId: z.string().trim().min(1).nullable().optional(),
})

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
  internalReasoning: string | null
  citedSources: AiDraftSource[]
  requestedToolCalls: InboxDraftRequestedToolCall[]
  decision: InboxDraftDecision
  runId: string
}

export interface GenerateInboxDraftCoreDeps {
  loadDraftRequest(
    tenantId: string,
    conversationId: string,
  ): Promise<PreparedInboxDraftRequest>
  provider: Pick<AiDraftProvider, 'providerId'> & {
    generateDraft(input: PreparedInboxDraftRequest): Promise<unknown>
  }
  createRun(input: {
    tenantId: string
    conversationId: string
    model: string
    inputContext: Json
  }): Promise<{ runId: string }>
  completeRun(input: {
    runId: string
    tenantId: string
    outputSummary: string
    inputContext: Json
    finalPolicyDecision: ToolPolicyDecision
    handoffReason: string | null
  }): Promise<void>
  failRun(input: {
    runId: string
    tenantId: string
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
      arguments: toolCall.arguments,
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
    internalReasoning: string | null
    citedSources: AiDraftSource[]
    providerRunId: string | null
    requestedToolCalls: InboxDraftRequestedToolCall[]
    decision: InboxDraftDecision
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
          internal_reasoning: result.internalReasoning,
          provider_run_id: result.providerRunId,
          requested_tool_calls: result.requestedToolCalls.map((toolCall) => ({
            name: toolCall.name,
            policy: toolCall.policy,
            arguments: toolCall.arguments,
          })),
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
): Omit<GeneratedInboxDraft, 'providerId' | 'promptId' | 'promptVersion' | 'runId' | 'decision'> {
  const parsed = providerResponseSchema.safeParse(payload)
  if (!parsed.success) {
    throw new InboxDraftRuntimeError(
      'MALFORMED_PROVIDER_RESPONSE',
      502,
      'La risposta del provider AI non e valida.',
    )
  }

  const draftText = normalizeDraftText(parsed.data.draftText)
  const citedSources = normalizeCitedSources(parsed.data.citedSources, request)
  const requestedToolCalls = normalizeRequestedToolCalls(
    parsed.data.requestedToolCalls,
    request,
  )

  return {
    confidence: parsed.data.confidence,
    intent: parsed.data.intent,
    handoff: parsed.data.handoff,
    internalReasoning: parsed.data.internalReasoning,
    providerRunId: parsed.data.providerRunId ?? null,
    draftText,
    citedSources,
    requestedToolCalls,
  }
}

export async function generateInboxDraftCore(
  input: {
    tenantId: string
    conversationId: string
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
    const decision = resolveInboxDraftDecision({
      request,
      result: normalized,
    })
    const finalPolicyDecision = resolveInboxDraftFinalPolicyDecision(
      normalized.requestedToolCalls,
    )
    const completedInputContext = buildRunInputContext(request, {
      confidence: normalized.confidence,
      intent: normalized.intent,
      handoff: normalized.handoff,
      internalReasoning: normalized.internalReasoning,
      citedSources: normalized.citedSources,
      providerRunId: normalized.providerRunId,
      requestedToolCalls: normalized.requestedToolCalls,
      decision,
    })

    await deps.completeRun({
      runId,
      tenantId: input.tenantId,
      outputSummary: normalized.draftText,
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
      ...normalized,
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

    await deps.failRun({
      runId,
      tenantId: input.tenantId,
      errorMessage: error instanceof Error ? error.message : runtimeError.publicMessage,
      inputContext: initialInputContext,
    })

    throw runtimeError
  }
}
