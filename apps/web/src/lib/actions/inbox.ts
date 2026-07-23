'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import { requireInboxTenantContext } from '@/lib/tenant-role-guard'
import {
  queryInboxConversations,
  queryInboxMessages,
  queryLatestInboundInboxAiRun,
} from '@/lib/messaging/inbox-queries'
import {
  resolveInboxDraftDecisionReasonSummary,
  type InboxDraftDecisionKind,
  type InboxDraftDecisionReasonCode,
  type AppointmentPreparationField,
} from '@/lib/ai/inbox-draft-decision'
import { resolveInboxDraftProviderLabel } from '@/lib/ai/inbox-draft-provider-selection'

// ── Authorization policy ──────────────────────────────────────────────────────
//
// Product decision:
//   all active staff_members of the tenant can view inbox conversations.
//
// Blocking rules remain enforced in getTenantRoleContext():
//   - is_active must be true
//   - deleted_at must be null
//   - tenant_id must match the requested tenant

// Re-export types so callers import from a single path
export type { InboxConversation, InboxMessage } from '@/lib/messaging/inbox-queries'

export interface InboxLatestAiRuntime {
  runId: string
  status: 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'
  providerLabel: string | null
  promptId: string | null
  promptVersion: string | null
  text: string | null
  usedAuthoritativeKnowledge: boolean
  sources: Array<{
    kind: 'conversation' | 'knowledge' | 'policy' | 'tool_result'
    label: string
  }>
  decision: {
    kind: InboxDraftDecisionKind
    reasonCode: InboxDraftDecisionReasonCode
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
  } | null
  errorCategory: string | null
  inboundMessage: {
    id: string
    bodyText: string | null
    createdAt: string | null
  }
}

function parseProfileName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const maybeArray = value as Array<{ full_name?: string | null }> | { full_name?: string | null }
  const profile = Array.isArray(maybeArray) ? maybeArray[0] : maybeArray
  const fullName = profile?.full_name?.trim() ?? ''

  return fullName.length > 0 ? fullName : null
}

async function loadStaffNameById(
  tenantId: string,
  staffIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(staffIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, profiles(full_name)')
    .eq('tenant_id', tenantId)
    .in('id', uniqueIds)

  if (error) {
    throw new Error(`[inbox] staff name lookup failed: ${error.message}`)
  }

  const names = new Map<string, string>()
  for (const row of data ?? []) {
    const fullName = parseProfileName((row as { profiles?: unknown }).profiles)
    if (fullName) {
      names.set(row.id, fullName)
    }
  }

  return names
}

// ── Server actions ────────────────────────────────────────────────────────────

export async function getInboxConversations(tenantId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  const conversations = await queryInboxConversations(db, tenantId)
  const staffNames = await loadStaffNameById(
    tenantId,
    conversations.map((conversation) => conversation.assignedStaffId).filter(Boolean) as string[],
  )

  return conversations.map((conversation) => ({
    ...conversation,
    assignedStaffName: conversation.assignedStaffId
      ? staffNames.get(conversation.assignedStaffId) ?? null
      : null,
  }))
}

export async function getInboxMessages(tenantId: string, conversationId: string) {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  const messages = await queryInboxMessages(db, tenantId, conversationId)
  const staffNames = await loadStaffNameById(
    tenantId,
    messages.map((message) => message.authorStaffId).filter(Boolean) as string[],
  )

  return messages.map((message) => ({
    ...message,
    authorName: message.authorStaffId
      ? staffNames.get(message.authorStaffId) ?? null
      : message.authorName,
  }))
}

export async function getInboxLatestAiRuntime(
  tenantId: string,
  conversationId: string,
): Promise<InboxLatestAiRuntime | null> {
  await requireInboxTenantContext(tenantId)
  const db = createMessagingAdminClient()
  const latestRun = await queryLatestInboundInboxAiRun(db, tenantId, conversationId)

  if (!latestRun) {
    return null
  }

  const decision =
    latestRun.decisionKind && latestRun.reasonCode
      ? {
          kind: latestRun.decisionKind as InboxDraftDecisionKind,
          reasonCode: latestRun.reasonCode as InboxDraftDecisionReasonCode,
          reasonSummary: resolveInboxDraftDecisionReasonSummary(
            latestRun.reasonCode as InboxDraftDecisionReasonCode,
          ),
          handoffRecommended: latestRun.decisionKind === 'human_handoff',
          appointmentPreparation: latestRun.appointmentPreparation
            ? {
                action: latestRun.appointmentPreparation.action,
                plannerState: latestRun.appointmentPreparation.plannerState,
                eligible: latestRun.appointmentPreparation.eligible,
                completeFields: latestRun.appointmentPreparation.completeFields as AppointmentPreparationField[],
                missingFields: latestRun.appointmentPreparation.missingFields as AppointmentPreparationField[],
                nextQuestion: latestRun.appointmentPreparation.nextQuestion,
                preparedToolCall: latestRun.appointmentPreparation.preparedToolCall,
                service: latestRun.appointmentPreparation.service,
                requestedDate: latestRun.appointmentPreparation.requestedDate,
                requestedTime: latestRun.appointmentPreparation.requestedTime,
                availabilityResult: latestRun.appointmentPreparation.availabilityResult,
              }
            : null,
        }
      : null

  return {
    runId: latestRun.id,
    status: latestRun.status,
    providerLabel: latestRun.providerId
      ? resolveInboxDraftProviderLabel(latestRun.providerId)
      : null,
    promptId: latestRun.promptId,
    promptVersion: latestRun.promptVersion,
    text: latestRun.status === 'completed' ? latestRun.outputSummary : null,
    usedAuthoritativeKnowledge: latestRun.usedAuthoritativeKnowledge,
    sources: latestRun.citedSourceSummary,
    decision,
    errorCategory: latestRun.errorCategory,
    inboundMessage: {
      id: latestRun.messageId,
      bodyText: latestRun.messageBodyText,
      createdAt: latestRun.messageCreatedAt,
    },
  }
}
