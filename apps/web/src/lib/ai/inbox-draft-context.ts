'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createMessagingAdminClient } from '@/lib/messaging/db'
import { requireInboxTenantContext } from '@/lib/tenant-role-guard'
import type {
  InboxConversationStatus,
  InboxOwnershipMode,
} from '@/lib/messaging/contracts'
import { getInboxDraftPromptDefinition } from './prompt-registry'
import { resolveInboxReceptionistConfig } from './inbox-ai-config'
import {
  buildInboxDraftRequest,
  InboxDraftPreparationError,
  type InboxDraftMessageRecord,
  type InboxDraftServiceRecord,
  type InboxDraftWorkingHoursRecord,
} from './inbox-draft-context-core'

function throwQueryError(scope: string, message: string): never {
  throw new InboxDraftPreparationError(
    'DRAFT_CONTEXT_QUERY_FAILED',
    `[inbox-ai] ${scope} query failed: ${message}`,
    500,
  )
}

export async function prepareInboxDraftRequest(
  tenantId: string,
  conversationId: string,
) {
  await requireInboxTenantContext(tenantId)

  const promptDefinition = getInboxDraftPromptDefinition()
  const db = createAdminClient()
  const messagingDb = createMessagingAdminClient()
  const [
    conversationResult,
    tenantResult,
    servicesResult,
    workingHoursResult,
    messagesResult,
  ] = await Promise.all([
    messagingDb
      .from('inbox_conversations')
      .select('id, tenant_id, status, ownership_mode, ai_paused_at, client_id')
      .eq('tenant_id', tenantId)
      .eq('id', conversationId)
      .maybeSingle(),
    db
      .from('tenants')
      .select('id, business_name, tagline, description, timezone, settings')
      .eq('id', tenantId)
      .maybeSingle(),
    db
      .from('services')
      .select('id, name, description, price, duration_minutes, display_order')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .limit(promptDefinition.maxServices),
    db
      .from('working_hours')
      .select('id, day_of_week, start_time, end_time')
      .eq('tenant_id', tenantId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
      .order('end_time', { ascending: true })
      .order('id', { ascending: true })
      .limit(promptDefinition.maxWorkingHoursRows),
    messagingDb
      .from('inbox_messages')
      .select('id, author_kind, body_text, created_at')
      .eq('tenant_id', tenantId)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(promptDefinition.maxConversationMessages),
  ])

  if (conversationResult.error) {
    throwQueryError('conversation', conversationResult.error.message)
  }

  if (tenantResult.error) {
    throwQueryError('tenant', tenantResult.error.message)
  }

  if (servicesResult.error) {
    throwQueryError('services', servicesResult.error.message)
  }

  if (workingHoursResult.error) {
    throwQueryError('working_hours', workingHoursResult.error.message)
  }

  if (messagesResult.error) {
    throwQueryError('messages', messagesResult.error.message)
  }

  if (!conversationResult.data) {
    throw new InboxDraftPreparationError(
      'CONVERSATION_NOT_FOUND',
      'Inbox conversation not found.',
      404,
    )
  }

  if (!tenantResult.data) {
    throw new InboxDraftPreparationError(
      'TENANT_NOT_FOUND',
      'Tenant profile not found.',
      404,
    )
  }

  return buildInboxDraftRequest({
    tenantId,
    conversationId,
    conversation: {
      id: conversationResult.data.id,
      tenantId: conversationResult.data.tenant_id,
      status: conversationResult.data.status as InboxConversationStatus,
      ownershipMode: conversationResult.data.ownership_mode as InboxOwnershipMode,
      aiPausedAt: conversationResult.data.ai_paused_at ?? null,
      clientId: conversationResult.data.client_id ?? null,
    },
    tenant: {
      id: tenantResult.data.id,
      businessName: tenantResult.data.business_name,
      tagline: tenantResult.data.tagline ?? null,
      description: tenantResult.data.description ?? null,
      timezone: tenantResult.data.timezone,
      receptionistConfig: resolveInboxReceptionistConfig(tenantResult.data.settings ?? null),
    },
    services: (servicesResult.data ?? []).map((service): InboxDraftServiceRecord => ({
      id: service.id,
      name: service.name,
      description: service.description ?? null,
      price: service.price,
      durationMinutes: service.duration_minutes,
      displayOrder: service.display_order,
    })),
    workingHours: (workingHoursResult.data ?? []).map(
      (window): InboxDraftWorkingHoursRecord => ({
        id: window.id,
        dayOfWeek: window.day_of_week,
        startTime: window.start_time,
        endTime: window.end_time,
      }),
    ),
    messages: (messagesResult.data ?? []).map((message): InboxDraftMessageRecord => ({
      id: message.id,
      authorKind: message.author_kind,
      bodyText: message.body_text ?? null,
      createdAt: message.created_at,
    })),
  })
}
