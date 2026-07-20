import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'

import type { Json } from '@/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { INBOX_TENANT_ROLES } from '@/lib/tenant-role-guard'

import { createMessagingAdminClient } from './db'
import {
  addInternalInboxNoteCore,
  InternalInboxNoteError,
  isInternalInboxNoteError,
  type InternalInboxNoteActor,
  type InternalInboxNoteConversation,
} from './internal-inbox-note-core'

const INTERNAL_NOTE_REQUEST_SCHEMA = z.object({
  text: z.string(),
}).strict()

function jsonInternalNoteError(error: InternalInboxNoteError) {
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

async function getConversation(
  conversationId: string,
): Promise<InternalInboxNoteConversation | null> {
  const db = createMessagingAdminClient()
  const { data, error } = await db
    .from('inbox_conversations')
    .select('id, tenant_id')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) {
    throw new Error(`[internal-inbox-note] inbox_conversations lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    id: data.id,
    tenantId: data.tenant_id,
  }
}

async function getAuthorizedActor(
  tenantId: string,
  userId: string,
): Promise<InternalInboxNoteActor | null> {
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
    throw new Error(`[internal-inbox-note] staff_members lookup failed: ${error.message}`)
  }

  if (!data) return null

  return {
    tenantId,
    userId,
    staffId: data.id,
    role: data.role as InternalInboxNoteActor['role'],
    displayName: parseProfileName((data as { profiles?: unknown }).profiles),
  }
}

async function createNote(input: {
  actor: InternalInboxNoteActor
  bodyText: string
  conversation: InternalInboxNoteConversation
}) {
  const db = createMessagingAdminClient()
  const createdAt = new Date().toISOString()
  const noteId = randomUUID()
  const metadata: Json = {
    source: 'internal_inbox_note',
    visibility: 'tenant_staff_only',
    actor: {
      user_id: input.actor.userId,
      staff_id: input.actor.staffId,
      role: input.actor.role,
      display_name: input.actor.displayName,
    },
  }

  const { error } = await db.from('messages_log').insert({
    id: noteId,
    tenant_id: input.conversation.tenantId,
    conversation_id: input.conversation.id,
    channel: 'whatsapp',
    provider: 'system',
    direction: 'outbound',
    type: 'internal_note',
    recipient: null,
    body_sent: input.bodyText,
    status: 'sent',
    metadata,
    sent_at: createdAt,
  })

  if (error) {
    throw new Error(`[internal-inbox-note] note insert failed: ${error.message}`)
  }

  return {
    id: `note:${noteId}`,
    conversationId: input.conversation.id,
    bodyText: input.bodyText,
    direction: 'system' as const,
    authorKind: 'human' as const,
    authorStaffId: input.actor.staffId,
    authorName: input.actor.displayName,
    createdAt,
    usedTemplate: false as const,
    timelineKind: 'internal_note' as const,
  }
}

export async function addInternalInboxNote(input: {
  conversationId: string
  text: string
}) {
  return addInternalInboxNoteCore(input, {
    getAuthenticatedUserId,
    getRequestTenantId,
    getConversation,
    getAuthorizedActor,
    createNote,
  })
}

export async function handleAddInternalInboxNoteRequest(
  request: Request,
  conversationId: string,
) {
  let payload: z.infer<typeof INTERNAL_NOTE_REQUEST_SCHEMA>
  try {
    payload = INTERNAL_NOTE_REQUEST_SCHEMA.parse(await request.json())
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
    const result = await addInternalInboxNote({
      conversationId,
      text: payload.text,
    })

    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    if (isInternalInboxNoteError(error)) {
      return jsonInternalNoteError(error)
    }

    console.error('[internal-inbox-note] request failed', {
      conversationId,
      error,
    })

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Impossibile salvare la nota interna.',
        },
      },
      { status: 500 },
    )
  }
}
