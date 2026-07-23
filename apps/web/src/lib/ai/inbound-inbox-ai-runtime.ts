'use server'

import type { Json } from '../../types/index.ts'
import type {
  AiDraftProvider,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'
import { resolveConfiguredInboxAvailabilityGateway } from './inbox-availability-gateway-selection.ts'
import type { GenerateInboxDraftCoreDeps } from './inbox-draft-orchestrator-core.ts'
import type {
  InboxDraftDecisionKind,
  InboxDraftDecisionReasonCode,
} from './inbox-draft-decision.ts'

const DEFAULT_BATCH_LIMIT = 10

type InboundAiRunStatus = 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'

type PreparedSystemDraftRequest = PreparedInboxDraftRequest
type ResolvedInboxDraftProvider = Pick<AiDraftProvider, 'providerId' | 'generateDraft'>

export interface QueuedInboundAiRunRow {
  id: string
  tenant_id: string
  conversation_id: string
  message_id: string | null
  provider_id: string | null
  prompt_id: string | null
  prompt_version: string | null
  status: InboundAiRunStatus
}

export type ProcessClaimedInboundAiRunOutcome = 'completed' | 'failed' | 'blocked' | 'skipped'

export interface ProcessClaimedInboundAiRunDeps {
  loadDraftRequest(
    tenantId: string,
    conversationId: string,
  ): Promise<PreparedSystemDraftRequest>
  resolveProvider(): ResolvedInboxDraftProvider
  updateRunTerminalState: typeof updateRunTerminalState
  runDraft(input: {
    row: QueuedInboundAiRunRow
    request: PreparedSystemDraftRequest
    provider: ResolvedInboxDraftProvider
  }): Promise<void>
}

export interface EnqueueInboundInboxAiRunResult {
  duplicate: boolean
  queued: boolean
  runId: string | null
}

export interface ProcessInboundInboxAiBatchSummary {
  claimed: number
  completed: number
  failed: number
  blocked: number
  skipped: number
}

async function createMessagingAdminDb() {
  const { createMessagingAdminClient } = await import('../messaging/db.ts')
  return createMessagingAdminClient()
}

async function loadPromptDefinition() {
  const { getInboxDraftPromptDefinition } = await import('./prompt-registry.ts')
  return getInboxDraftPromptDefinition()
}

function isProviderSelectionError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'InboxDraftProviderSelectionError'
}

function isRunPersistFailure(error: unknown): error is Error & { code: string } {
  return error instanceof Error
    && error.name === 'InboxDraftRuntimeError'
    && 'code' in error
    && error.code === 'RUN_PERSIST_FAILED'
}

function buildQueueInputContext(input: {
  messageId: string
}): Json {
  return {
    runtime: {
      entrypoint: 'meta_whatsapp_inbound',
      draft_delivery: 'human_review_only',
      auto_send_enabled: false,
    },
    request: {
      inbound_message_id: input.messageId,
    },
  }
}

function isConversationHumanControlled(request: PreparedSystemDraftRequest): boolean {
  return (
    request.conversationState.ownershipMode === 'human'
    || request.conversationState.status === 'human_requested'
    || request.conversationState.status === 'human_assigned'
    || request.conversationState.status === 'human_active'
    || request.conversationState.status === 'waiting_staff_approval'
  )
}

function isAiPaused(request: PreparedSystemDraftRequest): boolean {
  return request.conversationState.status === 'ai_paused'
    || request.conversationState.aiPausedAt !== null
}

async function updateRunTerminalState(input: {
  runId: string
  tenantId: string
  status: 'failed' | 'blocked' | 'skipped'
  decisionKind: InboxDraftDecisionKind
  reasonCode: InboxDraftDecisionReasonCode
  providerId?: string | null
  promptId?: string | null
  promptVersion?: string | null
  messageId?: string | null
  errorCategory?: string | null
  outputSummary?: string | null
  inputContext?: Json
}) {
  const db = await createMessagingAdminDb()
  const { error } = await db
    .from('inbox_ai_runs')
    .update({
      status: input.status,
      completed_at: new Date().toISOString(),
      message_id: input.messageId ?? null,
      provider_id: input.providerId ?? null,
      prompt_id: input.promptId ?? null,
      prompt_version: input.promptVersion ?? null,
      decision_kind: input.decisionKind,
      reason_code: input.reasonCode,
      error_category: input.errorCategory ?? null,
      output_summary: input.outputSummary ?? null,
      input_context: input.inputContext ?? {},
    })
    .eq('tenant_id', input.tenantId)
    .eq('id', input.runId)

  if (error) {
    throw new Error(`[inbound-inbox-ai] run terminal update failed: ${error.message}`)
  }
}

function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === '23505'
}

export async function enqueueInboundInboxAiRun(input: {
  tenantId: string
  conversationId: string
  messageId: string
}): Promise<EnqueueInboundInboxAiRunResult> {
  const [db, promptDefinition, providerSelectionModule] = await Promise.all([
    createMessagingAdminDb(),
    loadPromptDefinition(),
    import('./inbox-draft-provider-selection.ts'),
  ])
  const providerId = providerSelectionModule.resolveConfiguredInboxDraftProviderId()

  const { data, error } = await db
    .from('inbox_ai_runs')
    .insert({
      tenant_id: input.tenantId,
      conversation_id: input.conversationId,
      message_id: input.messageId,
      provider_id: providerId,
      prompt_id: promptDefinition.promptId,
      prompt_version: promptDefinition.version,
      model: providerId,
      mode: 'draft_only',
      status: 'queued',
      input_context: buildQueueInputContext({ messageId: input.messageId }),
    })
    .select('id')
    .single()

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        duplicate: true,
        queued: false,
        runId: null,
      }
    }

    throw new Error(`[inbound-inbox-ai] queue insert failed: ${error.message}`)
  }

  return {
    duplicate: false,
    queued: true,
    runId: data?.id ?? null,
  }
}

async function claimQueuedRun(
  row: QueuedInboundAiRunRow,
): Promise<QueuedInboundAiRunRow | null> {
  const db = await createMessagingAdminDb()
  const { data, error } = await db
    .from('inbox_ai_runs')
    .update({
      status: 'started',
    })
    .eq('tenant_id', row.tenant_id)
    .eq('id', row.id)
    .eq('status', 'queued')
    .select('id, tenant_id, conversation_id, message_id, provider_id, prompt_id, prompt_version, status')
    .maybeSingle()

  if (error) {
    throw new Error(`[inbound-inbox-ai] queue claim failed: ${error.message}`)
  }

  return data ?? null
}

function buildExistingRunDeps(input: {
  runId: string
  tenantId: string
  request: PreparedSystemDraftRequest
  provider: ResolvedInboxDraftProvider
}): GenerateInboxDraftCoreDeps {
  const availabilityGateway = resolveConfiguredInboxAvailabilityGateway()

  return {
    loadDraftRequest: async () => input.request,
    provider: input.provider,
    availabilityGateway,
    async createRun(createInput) {
      const db = await createMessagingAdminDb()
      const { error } = await db
        .from('inbox_ai_runs')
        .update({
          status: 'started',
          message_id: createInput.messageId,
          provider_id: createInput.providerId,
          prompt_id: createInput.promptId,
          prompt_version: createInput.promptVersion,
          model: createInput.model,
          input_context: createInput.inputContext,
        })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.runId)

      if (error) {
        throw new Error(`[inbound-inbox-ai] existing run update failed: ${error.message}`)
      }

      return { runId: input.runId }
    },
    async completeRun(completeInput) {
      const db = await createMessagingAdminDb()
      const { error } = await db
        .from('inbox_ai_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          message_id: completeInput.messageId,
          provider_id: completeInput.providerId,
          prompt_id: completeInput.promptId,
          prompt_version: completeInput.promptVersion,
          model: completeInput.providerId,
          intent: completeInput.intent,
          confidence: completeInput.confidence,
          decision_kind: completeInput.decisionKind,
          reason_code: completeInput.reasonCode,
          deterministic_resolver: completeInput.deterministicResolver,
          used_authoritative_knowledge: completeInput.usedAuthoritativeKnowledge,
          cited_source_summary: completeInput.citedSourceSummary as unknown as Json,
          final_policy_decision: completeInput.finalPolicyDecision,
          handoff_reason: completeInput.handoffReason,
          input_context: completeInput.inputContext,
          output_summary: completeInput.outputSummary,
          error_category: null,
        })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.runId)

      if (error) {
        throw new Error(`[inbound-inbox-ai] run completion update failed: ${error.message}`)
      }
    },
    async failRun(failInput) {
      await updateRunTerminalState({
        runId: input.runId,
        tenantId: input.tenantId,
        status: 'failed',
        decisionKind: failInput.decisionKind,
        reasonCode: failInput.reasonCode,
        providerId: failInput.providerId,
        promptId: failInput.promptId,
        promptVersion: failInput.promptVersion,
        messageId: failInput.messageId,
        errorCategory: failInput.errorCategory,
        outputSummary: failInput.errorMessage,
        inputContext: failInput.inputContext,
      })
    },
  }
}

export async function processClaimedInboundInboxAiRunCore(
  row: QueuedInboundAiRunRow,
  deps: ProcessClaimedInboundAiRunDeps,
): Promise<ProcessClaimedInboundAiRunOutcome> {
  if (!row.message_id) {
    await deps.updateRunTerminalState({
      runId: row.id,
      tenantId: row.tenant_id,
      status: 'failed',
      decisionKind: 'blocked',
      reasonCode: 'provider_failed',
      providerId: row.provider_id,
      promptId: row.prompt_id,
      promptVersion: row.prompt_version,
      errorCategory: 'MESSAGE_ID_MISSING',
      outputSummary: 'Inbound message association missing.',
    })
    return 'failed'
  }

  let request: PreparedSystemDraftRequest
  try {
    request = await deps.loadDraftRequest(row.tenant_id, row.conversation_id)
  } catch (error) {
    await deps.updateRunTerminalState({
      runId: row.id,
      tenantId: row.tenant_id,
      status: 'failed',
      decisionKind: 'blocked',
      reasonCode: 'provider_failed',
      providerId: row.provider_id,
      promptId: row.prompt_id,
      promptVersion: row.prompt_version,
      messageId: row.message_id,
      errorCategory: error instanceof Error ? error.name : 'DRAFT_CONTEXT_LOAD_FAILED',
      outputSummary: error instanceof Error ? error.message : 'Draft context load failed.',
    })
    return 'failed'
  }

  if (request.receptionistConfig.mode === 'disabled') {
    await deps.updateRunTerminalState({
      runId: row.id,
      tenantId: row.tenant_id,
      status: 'blocked',
      decisionKind: 'blocked',
      reasonCode: 'tenant_mode_disabled',
      providerId: row.provider_id,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      messageId: row.message_id,
      outputSummary: 'AI receptionist disabled for tenant.',
    })
    return 'blocked'
  }

  if (isConversationHumanControlled(request)) {
    await deps.updateRunTerminalState({
      runId: row.id,
      tenantId: row.tenant_id,
      status: 'skipped',
      decisionKind: 'human_handoff',
      reasonCode: 'human_control_active',
      providerId: row.provider_id,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      messageId: row.message_id,
      outputSummary: 'Conversation already under human control.',
    })
    return 'skipped'
  }

  if (isAiPaused(request)) {
    await deps.updateRunTerminalState({
      runId: row.id,
      tenantId: row.tenant_id,
      status: 'skipped',
      decisionKind: 'human_handoff',
      reasonCode: 'ai_paused',
      providerId: row.provider_id,
      promptId: request.promptId,
      promptVersion: request.promptVersion,
      messageId: row.message_id,
      outputSummary: 'AI paused for conversation.',
    })
    return 'skipped'
  }

  let provider
  try {
    provider = deps.resolveProvider()
  } catch (error) {
    if (isProviderSelectionError(error)) {
      await deps.updateRunTerminalState({
        runId: row.id,
        tenantId: row.tenant_id,
        status: 'failed',
        decisionKind: 'blocked',
        reasonCode: 'provider_not_configured',
        providerId: row.provider_id,
        promptId: request.promptId,
        promptVersion: request.promptVersion,
        messageId: row.message_id,
        errorCategory: 'PROVIDER_NOT_CONFIGURED',
        outputSummary: error.message,
      })
      return 'failed'
    }

    throw error
  }

  try {
    await deps.runDraft({
      row,
      request,
      provider,
    })

    return 'completed'
  } catch (error) {
    if (isRunPersistFailure(error)) {
      await deps.updateRunTerminalState({
        runId: row.id,
        tenantId: row.tenant_id,
        status: 'failed',
        decisionKind: 'blocked',
        reasonCode: 'provider_failed',
        providerId: provider.providerId,
        promptId: request.promptId,
        promptVersion: request.promptVersion,
        messageId: row.message_id,
        errorCategory: error.code,
        outputSummary: error.message,
      })
    }

    return 'failed'
  }
}

export const processClaimedInboundAiRunCore = processClaimedInboundInboxAiRunCore

async function processClaimedRun(
  row: QueuedInboundAiRunRow,
): Promise<ProcessClaimedInboundAiRunOutcome> {
  const [
    draftContextModule,
    providerSelectionModule,
    orchestratorModule,
  ] = await Promise.all([
    import('./inbox-draft-context.ts'),
    import('./inbox-draft-provider-selection.ts'),
    import('./inbox-draft-orchestrator-core.ts'),
  ])

  return processClaimedInboundInboxAiRunCore(row, {
    loadDraftRequest: draftContextModule.prepareInboxDraftRequestSystem,
    resolveProvider: providerSelectionModule.resolveConfiguredInboxDraftProvider,
    updateRunTerminalState,
    async runDraft(input) {
      await orchestratorModule.generateInboxDraftCore(
        {
          tenantId: input.row.tenant_id,
          conversationId: input.row.conversation_id,
          messageId: input.row.message_id,
        },
        {
          ...buildExistingRunDeps({
            runId: input.row.id,
            tenantId: input.row.tenant_id,
            request: input.request,
            provider: input.provider,
          }),
          provider: input.provider,
        },
      )
    },
  })
}

export async function processQueuedInboundInboxAiRunsBatch(
  limit = DEFAULT_BATCH_LIMIT,
): Promise<ProcessInboundInboxAiBatchSummary> {
  const summary: ProcessInboundInboxAiBatchSummary = {
    claimed: 0,
    completed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
  }

  const db = await createMessagingAdminDb()
  const { data, error } = await db
    .from('inbox_ai_runs')
    .select('id, tenant_id, conversation_id, message_id, provider_id, prompt_id, prompt_version, status')
    .eq('mode', 'draft_only')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`[inbound-inbox-ai] queued run fetch failed: ${error.message}`)
  }

  for (const row of data ?? []) {
    const claimed = await claimQueuedRun(row)
    if (!claimed) {
      continue
    }

    summary.claimed += 1
    const outcome = await processClaimedRun(claimed)
    summary[outcome] += 1
  }

  return summary
}
