import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

import type { Json } from '@/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { INBOX_TENANT_ROLES } from '@/lib/tenant-role-guard'

import { createMessagingAdminClient } from './db'
import {
  ConversationStateError,
  isConversationStateError,
  transitionConversationState,
  updateConversationStateCore,
  type ConversationStateActor,
  type ConversationStateSnapshot,
  type ConversationStateTransitionInput,
  type ConversationStateTransitionResult,
  type UpdateConversationStateInput,
} from './conversation-state-core'

const OWNERSHIP_REQUEST_SCHEMA = z.object({
  action: z.enum(['take_control', 'release_control', 'return_to_ai']),
  reason: z.string().trim().max(500).optional(),
}).strict()

function jsonStateError(error: ConversationStateError) {
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

function parseProfileName(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null

  const maybeArray = value as Array<{ full_name?: string | null }> | { full_name?: string | null }
  const profile = Array.isArray(maybeArray) ? maybeArray[0] : maybeArray
  const fullName = profile?.full_name?.trim() ?? ''

  return fullName.length > 0 ? fullName : null
}

function buildHumanMessageEchoActor(tenantId: string): ConversationStateActor {
  return {
    tenantId,
    userId: null,
    staffId: null,
    role: 'system',
    displayName: 'WhatsApp Business App',
  }
}

async function getAuthenticatedUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.id ?? null
}

async function getRequestTenantId(): Promise<string | null> {
  return getActiveTenantId()
}

async function getConversationSnapshot(
  conversationId: string,
): Promise<ConversationStateSnapshot | null> {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('inbox_conversations')
    .select('id, tenant_id, status, ownership_mode, assigned_staff_id, ai_paused_at')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    throw new Error(`[conversation-state] inbox_conversations lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    conversationId: data.id,
    tenantId: data.tenant_id,
    status: data.status as ConversationStateSnapshot['status'],
    ownershipMode: data.ownership_mode,
    assignedStaffId: data.assigned_staff_id,
    aiPausedAt: data.ai_paused_at,
  }
}

async function getAuthorizedActor(
  tenantId: string,
  userId: string,
): Promise<ConversationStateActor | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('staff_members')
    .select('id, role, profiles(full_name)')
    .eq('tenant_id', tenantId)
    .eq('profile_id', userId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .in('role', [...INBOX_TENANT_ROLES])
    .maybeSingle()

  if (error) {
    throw new Error(`[conversation-state] staff_members lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    tenantId,
    userId,
    staffId: data.id,
    role: data.role as ConversationStateActor['role'],
    displayName: parseProfileName((data as { profiles?: unknown }).profiles),
  }
}

function applyAssignmentScope<T extends { eq(column: string, value: string): T; is(column: string, value: null): T }>(
  query: T,
  assignedStaffId: string | null,
): T {
  if (assignedStaffId) {
    return query.eq('assigned_staff_id', assignedStaffId)
  }

  return query.is('assigned_staff_id', null)
}

async function persistAssignmentState(input: {
  actor: ConversationStateActor
  result: ConversationStateTransitionResult
  occurredAt: string
}) {
  const db = createMessagingAdminClient()
  const { from, to, reason } = input.result

  const { data: activeAssignment, error: activeAssignmentError } = await db
    .from('inbox_assignments')
    .select('id, assigned_staff_id')
    .eq('tenant_id', to.tenantId)
    .eq('conversation_id', from.conversationId)
    .is('released_at', null)
    .maybeSingle()

  if (activeAssignmentError) {
    throw new Error(`[conversation-state] active assignment lookup failed: ${activeAssignmentError.message}`)
  }

  if (activeAssignment && (!to.assignedStaffId || activeAssignment.assigned_staff_id !== to.assignedStaffId)) {
    const { error: releaseError } = await db
      .from('inbox_assignments')
      .update({
        released_at: input.occurredAt,
      })
      .eq('tenant_id', to.tenantId)
      .eq('id', activeAssignment.id)

    if (releaseError) {
      throw new Error(`[conversation-state] assignment release failed: ${releaseError.message}`)
    }
  }

  const shouldInsertAssignment =
    !!to.assignedStaffId
    && (!activeAssignment || activeAssignment.assigned_staff_id !== to.assignedStaffId)

  if (!shouldInsertAssignment) return

  const { error: insertError } = await db.from('inbox_assignments').insert({
    tenant_id: to.tenantId,
    conversation_id: to.conversationId,
    assigned_staff_id: to.assignedStaffId,
    assigned_by_profile_id: input.actor.userId,
    assignment_reason: reason,
    created_at: input.occurredAt,
  })

  if (insertError) {
    throw new Error(`[conversation-state] assignment insert failed: ${insertError.message}`)
  }
}

async function appendConversationAudit(input: {
  actor: ConversationStateActor
  result: ConversationStateTransitionResult
  occurredAt: string
}) {
  if (!input.result.summary) return

  const db = createMessagingAdminClient()
  const metadata: Json = {
    source: 'conversation_state_service',
    action: input.result.action,
    reason: input.result.reason,
    actor: {
      user_id: input.actor.userId,
      staff_id: input.actor.staffId,
      role: input.actor.role,
      display_name: input.actor.displayName,
    },
    from: {
      status: input.result.from.status,
      ownership_mode: input.result.from.ownershipMode,
      assigned_staff_id: input.result.from.assignedStaffId,
      ai_paused_at: input.result.from.aiPausedAt,
    },
    to: {
      status: input.result.to.status,
      ownership_mode: input.result.to.ownershipMode,
      assigned_staff_id: input.result.to.assignedStaffId,
      ai_paused_at: input.result.to.aiPausedAt,
    },
  }

  const { error } = await db.from('messages_log').insert({
    tenant_id: input.result.to.tenantId,
    conversation_id: input.result.to.conversationId,
    channel: 'whatsapp',
    provider: 'system',
    direction: 'outbound',
    type: 'conversation_audit',
    recipient: null,
    body_sent: input.result.summary,
    status: 'sent',
    metadata,
    sent_at: input.occurredAt,
  })

  if (error) {
    throw new Error(`[conversation-state] audit insert failed: ${error.message}`)
  }
}

async function persistConversationSnapshot(
  input: ConversationStateTransitionInput,
): Promise<ConversationStateTransitionResult> {
  const result = transitionConversationState(input)
  if (!result.changed) {
    return result
  }

  const db = createMessagingAdminClient()

  let updateQuery = db
    .from('inbox_conversations')
    .update({
      status: result.to.status,
      ownership_mode: result.to.ownershipMode,
      assigned_staff_id: result.to.assignedStaffId,
      ai_paused_at: result.to.aiPausedAt,
    })
    .eq('id', result.from.conversationId)
    .eq('tenant_id', result.from.tenantId)
    .eq('status', result.from.status)
    .eq('ownership_mode', result.from.ownershipMode)

  updateQuery = applyAssignmentScope(updateQuery, result.from.assignedStaffId)

  const { data: updatedRow, error: updateError } = await updateQuery
    .select('id, tenant_id, status, ownership_mode, assigned_staff_id, ai_paused_at')
    .maybeSingle()

  if (updateError) {
    throw new Error(`[conversation-state] conversation update failed: ${updateError.message}`)
  }

  if (!updatedRow) {
    throw new ConversationStateError(
      'CONVERSATION_STATE_CONFLICT',
      409,
      'La conversazione e stata aggiornata da un altro operatore. Ricarica e riprova.',
    )
  }

  const persistedResult: ConversationStateTransitionResult = {
    ...result,
    to: {
      conversationId: updatedRow.id,
      tenantId: updatedRow.tenant_id,
      status: updatedRow.status as ConversationStateSnapshot['status'],
      ownershipMode: updatedRow.ownership_mode,
      assignedStaffId: updatedRow.assigned_staff_id,
      aiPausedAt: updatedRow.ai_paused_at,
    },
  }

  await persistAssignmentState({
    actor: input.actor,
    result: persistedResult,
    occurredAt: input.occurredAt,
  })

  await appendConversationAudit({
    actor: input.actor,
    result: persistedResult,
    occurredAt: input.occurredAt,
  })

  return persistedResult
}

export async function syncConversationStateAfterHumanReply(input: {
  actor: ConversationStateActor
  conversationId: string
  reason?: string | null
}) {
  const conversation = await getConversationSnapshot(input.conversationId)
  if (!conversation) {
    throw new ConversationStateError(
      'CONVERSATION_NOT_FOUND',
      404,
      'Conversazione non trovata.',
    )
  }

  return persistConversationSnapshot({
    action: 'human_reply',
    actor: input.actor,
    conversation,
    occurredAt: new Date().toISOString(),
    reason: input.reason,
  })
}

export async function syncConversationStateAfterHumanMessageEcho(input: {
  conversationId: string
  reason?: string | null
}) {
  const conversation = await getConversationSnapshot(input.conversationId)
  if (!conversation) {
    throw new ConversationStateError(
      'CONVERSATION_NOT_FOUND',
      404,
      'Conversazione non trovata.',
    )
  }

  return persistConversationSnapshot({
    action: 'human_message_echo',
    actor: buildHumanMessageEchoActor(conversation.tenantId),
    conversation,
    occurredAt: new Date().toISOString(),
    reason: input.reason,
  })
}

export async function updateConversationState(input: UpdateConversationStateInput) {
  return updateConversationStateCore(input, {
    getAuthenticatedUserId,
    getRequestTenantId,
    getConversation: getConversationSnapshot,
    getAuthorizedActor,
    applyTransition: persistConversationSnapshot,
  })
}

export async function handleUpdateConversationStateRequest(
  request: NextRequest,
  conversationId: string,
) {
  let payload: z.infer<typeof OWNERSHIP_REQUEST_SCHEMA>
  try {
    payload = OWNERSHIP_REQUEST_SCHEMA.parse(await request.json())
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Richiesta non valida.',
        },
      },
      { status: 400 },
    )
  }

  try {
    const result = await updateConversationState({
      conversationId,
      action: payload.action,
      reason: payload.reason,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (isConversationStateError(error)) {
      return jsonStateError(error)
    }

    console.error('[conversation-state] request failed', {
      conversationId,
      error,
    })

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Impossibile aggiornare la conversazione.',
        },
      },
      { status: 500 },
    )
  }
}
