const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const INTERNAL_INBOX_NOTE_MAX_LENGTH = 2_000

export type InternalInboxNoteActorRole = 'owner' | 'manager' | 'receptionist' | 'staff'

export interface InternalInboxNoteInput {
  conversationId: string
  text: string
}

export interface InternalInboxNoteConversation {
  id: string
  tenantId: string
}

export interface InternalInboxNoteActor {
  tenantId: string
  userId: string
  staffId: string
  role: InternalInboxNoteActorRole
  displayName: string | null
}

export interface InternalInboxNoteMessage {
  id: string
  conversationId: string
  bodyText: string
  direction: 'system'
  authorKind: 'human'
  authorStaffId: string
  authorName: string | null
  createdAt: string
  usedTemplate: false
  timelineKind: 'internal_note'
}

export interface InternalInboxNoteSuccess {
  ok: true
  note: InternalInboxNoteMessage
}

export interface InternalInboxNoteCoreDeps {
  getAuthenticatedUserId(): Promise<string | null>
  getRequestTenantId(): Promise<string | null>
  getConversation(conversationId: string): Promise<InternalInboxNoteConversation | null>
  getAuthorizedActor(tenantId: string, userId: string): Promise<InternalInboxNoteActor | null>
  createNote(input: {
    actor: InternalInboxNoteActor
    bodyText: string
    conversation: InternalInboxNoteConversation
  }): Promise<InternalInboxNoteMessage>
}

export class InternalInboxNoteError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly publicMessage: string

  constructor(code: string, httpStatus: number, publicMessage: string) {
    super(publicMessage)
    this.name = 'InternalInboxNoteError'
    this.code = code
    this.httpStatus = httpStatus
    this.publicMessage = publicMessage
  }
}

export function isInternalInboxNoteError(error: unknown): error is InternalInboxNoteError {
  return error instanceof InternalInboxNoteError
}

export function normalizeInternalInboxNoteText(input: string): string {
  const normalized = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim()

  if (normalized.length === 0) {
    throw new InternalInboxNoteError(
      'EMPTY_NOTE',
      400,
      'Scrivi una nota prima di salvarla.',
    )
  }

  if (normalized.length > INTERNAL_INBOX_NOTE_MAX_LENGTH) {
    throw new InternalInboxNoteError(
      'NOTE_TOO_LONG',
      400,
      `La nota supera il limite di ${INTERNAL_INBOX_NOTE_MAX_LENGTH} caratteri.`,
    )
  }

  return normalized
}

export async function addInternalInboxNoteCore(
  input: InternalInboxNoteInput,
  deps: InternalInboxNoteCoreDeps,
): Promise<InternalInboxNoteSuccess> {
  const conversationId = input.conversationId.trim()
  if (!UUID_RE.test(conversationId)) {
    throw new InternalInboxNoteError(
      'INVALID_CONVERSATION_ID',
      400,
      'Conversazione non valida.',
    )
  }

  const bodyText = normalizeInternalInboxNoteText(input.text)

  const userId = await deps.getAuthenticatedUserId()
  if (!userId) {
    throw new InternalInboxNoteError(
      'UNAUTHENTICATED',
      401,
      'Sessione non valida.',
    )
  }

  const conversation = await deps.getConversation(conversationId)
  if (!conversation) {
    throw new InternalInboxNoteError(
      'CONVERSATION_NOT_FOUND',
      404,
      'Conversazione non trovata.',
    )
  }

  const requestTenantId = await deps.getRequestTenantId()
  if (requestTenantId && requestTenantId !== conversation.tenantId) {
    throw new InternalInboxNoteError(
      'CROSS_TENANT_CONVERSATION',
      404,
      'Conversazione non trovata.',
    )
  }

  const actor = await deps.getAuthorizedActor(conversation.tenantId, userId)
  if (!actor) {
    throw new InternalInboxNoteError(
      'FORBIDDEN',
      403,
      'Non sei autorizzato a salvare note per questo salone.',
    )
  }

  return {
    ok: true,
    note: await deps.createNote({
      actor,
      bodyText,
      conversation,
    }),
  }
}
