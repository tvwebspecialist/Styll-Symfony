'use server'

import { NextResponse } from 'next/server'

import type { Json } from '@/types'
import { getActiveTenantId } from '@/lib/tenant-context'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import {
  generateInboxDraftCore,
  isInboxDraftRuntimeError,
  type GenerateInboxDraftCoreDeps,
} from './inbox-draft-orchestrator-core'
import { prepareInboxDraftRequest } from './inbox-draft-context'
import type { AppointmentPreparationField } from './inbox-draft-decision'
import { resolveConfiguredInboxAvailabilityGateway } from './inbox-availability-gateway-selection'
import {
  InboxDraftProviderSelectionError,
  resolveConfiguredInboxDraftProvider,
  resolveInboxDraftProviderLabel,
} from './inbox-draft-provider-selection'

export interface PublicInboxDraftSourceAttribution {
  kind: 'conversation' | 'knowledge' | 'policy' | 'tool_result'
  label: string
}

export interface PublicInboxDraftDecision {
  kind: 'draft_review' | 'human_handoff' | 'auto_reply_candidate' | 'action_prepare_candidate' | 'blocked'
  reasonCode: string
  reasonSummary: string
  handoffRecommended: boolean
  appointmentPreparation: {
    action: 'booking' | 'reschedule' | 'cancellation'
    plannerState: string
    eligible: boolean
    completeFields: AppointmentPreparationField[]
    missingFields: AppointmentPreparationField[]
    nextQuestion: string | null
    preparedToolCall: {
      name:
        | 'prepare_booking_sandbox'
        | 'prepare_appointment'
        | 'prepare_reschedule'
        | 'prepare_cancellation'
      arguments: {
        service?: string
        requested_date?: string
        requested_time?: string
        selected_slot?: string
        customer_name?: string | null
        current_appointment_reference?: string
        customer_notes: string
        conversation_summary: string
      }
    } | null
    service: string | null
    requestedDate: string | null
    requestedTime: string | null
    availabilityResult: {
      available: boolean
      requestedSlot: {
        date: string
        startTime: string
        endTime: string
        staffIds: string[]
      } | null
      suggestedSlots: Array<{
        date: string
        startTime: string
        endTime: string
        staffIds: string[]
      }>
      reason:
        | 'available'
        | 'slot_unavailable'
        | 'business_closed'
        | 'service_unavailable'
    } | null
  } | null
}

export interface PublicInboxDraftResult {
  text: string
  promptId: string
  promptVersion: string
  providerLabel: string
  usedAuthoritativeKnowledge: boolean
  sources: PublicInboxDraftSourceAttribution[]
  decision: PublicInboxDraftDecision
}

function toPublicDraftResult(
  result: Awaited<ReturnType<typeof generateInboxConversationDraft>>,
): PublicInboxDraftResult {
  return {
    text: result.draftText,
    promptId: result.promptId,
    promptVersion: result.promptVersion,
    providerLabel: resolveInboxDraftProviderLabel(result.providerId),
    usedAuthoritativeKnowledge: result.usedAuthoritativeKnowledge,
    sources: result.citedSources.map((source) => ({
      kind: source.kind,
      label: source.label,
    })),
    decision: {
      kind: result.decision.kind,
      reasonCode: result.decision.reasonCode,
      reasonSummary: result.decision.reasonSummary,
      handoffRecommended: result.decision.handoffRecommended,
      appointmentPreparation: result.decision.appointmentPreparation
        ? {
            action: result.decision.appointmentPreparation.action,
            plannerState: result.decision.appointmentPreparation.plannerState,
            eligible: result.decision.appointmentPreparation.eligible,
            completeFields: result.decision.appointmentPreparation.completeFields,
            missingFields: result.decision.appointmentPreparation.missingFields,
            nextQuestion: result.decision.appointmentPreparation.nextQuestion,
            preparedToolCall: result.decision.appointmentPreparation.preparedToolCall,
            service: result.decision.appointmentPreparation.service,
            requestedDate: result.decision.appointmentPreparation.requestedDate,
            requestedTime: result.decision.appointmentPreparation.requestedTime,
            availabilityResult: result.decision.appointmentPreparation.availabilityResult,
          }
        : null,
    },
  }
}

function buildInboxAiRunContextUpdate(
  baseContext: Json,
  patch: Record<string, unknown>,
): Json {
  const base =
    baseContext && typeof baseContext === 'object' && !Array.isArray(baseContext)
      ? baseContext as Record<string, unknown>
      : {}

  return JSON.parse(JSON.stringify({
    ...base,
    audit: patch,
  })) as Json
}

function createDefaultInboxDraftDeps(): GenerateInboxDraftCoreDeps {
  const provider = resolveConfiguredInboxDraftProvider()
  const availabilityGateway = resolveConfiguredInboxAvailabilityGateway()

  return {
    loadDraftRequest: prepareInboxDraftRequest,
    provider,
    availabilityGateway,
    async createRun(input) {
      const db = createMessagingAdminClient()
      const { data, error } = await db
        .from('inbox_ai_runs')
        .insert({
          tenant_id: input.tenantId,
          conversation_id: input.conversationId,
          message_id: input.messageId,
          provider_id: input.providerId,
          prompt_id: input.promptId,
          prompt_version: input.promptVersion,
          model: input.model,
          mode: 'draft_only',
          status: 'started',
          input_context: input.inputContext,
        })
        .select('id')
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? 'inbox_ai_runs insert failed')
      }

      return { runId: data.id }
    },
    async completeRun(input) {
      const db = createMessagingAdminClient()
      const { error } = await db
        .from('inbox_ai_runs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          message_id: input.messageId,
          provider_id: input.providerId,
          prompt_id: input.promptId,
          prompt_version: input.promptVersion,
          intent: input.intent,
          confidence: input.confidence,
          decision_kind: input.decisionKind,
          reason_code: input.reasonCode,
          deterministic_resolver: input.deterministicResolver,
          used_authoritative_knowledge: input.usedAuthoritativeKnowledge,
          cited_source_summary: input.citedSourceSummary as unknown as Json,
          final_policy_decision: input.finalPolicyDecision,
          handoff_reason: input.handoffReason,
          input_context: input.inputContext,
          output_summary: input.outputSummary,
        })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.runId)

      if (error) {
        throw new Error(`inbox_ai_runs completion update failed: ${error.message}`)
      }
    },
    async failRun(input) {
      const db = createMessagingAdminClient()
      const { error } = await db
        .from('inbox_ai_runs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          message_id: input.messageId,
          provider_id: input.providerId,
          prompt_id: input.promptId,
          prompt_version: input.promptVersion,
          decision_kind: input.decisionKind,
          reason_code: input.reasonCode,
          error_category: input.errorCategory,
          input_context: buildInboxAiRunContextUpdate(input.inputContext, {
            error_message: input.errorMessage,
          }),
          output_summary: input.errorMessage,
        })
        .eq('tenant_id', input.tenantId)
        .eq('id', input.runId)

      if (error) {
        throw new Error(`inbox_ai_runs failure update failed: ${error.message}`)
      }
    },
  }
}

export async function generateInboxConversationDraft(
  tenantId: string,
  conversationId: string,
  deps: GenerateInboxDraftCoreDeps = createDefaultInboxDraftDeps(),
) {
  return generateInboxDraftCore(
    {
      tenantId,
      conversationId,
    },
    deps,
  )
}

export async function handleGenerateInboxDraftRequest(
  conversationId: string,
) {
  const tenantId = await getActiveTenantId()
  if (!tenantId) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'TENANT_CONTEXT_MISSING',
          message: 'Tenant attivo non disponibile.',
        },
      },
      { status: 401 },
    )
  }

  try {
    const result = await generateInboxConversationDraft(tenantId, conversationId)
    return NextResponse.json(
      {
        ok: true,
        draft: toPublicDraftResult(result),
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof InboxDraftProviderSelectionError) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'PROVIDER_NOT_CONFIGURED',
            message: 'Provider AI non configurato correttamente.',
          },
        },
        { status: 503 },
      )
    }

    if (isInboxDraftRuntimeError(error)) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: error.code,
            message: error.publicMessage,
          },
        },
        { status: error.httpStatus },
      )
    }

    console.error('[inbox-ai] unexpected draft error', error)
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Errore interno durante la generazione della bozza AI.',
        },
      },
      { status: 500 },
    )
  }
}
