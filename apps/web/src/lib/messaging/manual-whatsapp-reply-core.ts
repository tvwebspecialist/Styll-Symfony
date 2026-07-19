export const MANUAL_WHATSAPP_MESSAGE_MAX_LENGTH = 4096
export const RECENT_DUPLICATE_WINDOW_MS = 30_000

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type ManualWhatsAppReplyRole = 'owner' | 'manager' | 'receptionist' | 'staff'
export type ManualWhatsAppReplyDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface ManualWhatsAppReplyInput {
  conversationId: string
  text: string
}

export interface ManualWhatsAppReplyMessage {
  id: string
  conversationId: string
  bodyText: string
  direction: 'outbound'
  authorKind: 'human'
  createdAt: string
  usedTemplate: false
  deliveryStatus: ManualWhatsAppReplyDeliveryStatus
}

export interface ManualWhatsAppReplySuccess {
  ok: true
  duplicate: boolean
  message: ManualWhatsAppReplyMessage
}

export interface ManualWhatsAppReplyConversation {
  id: string
  tenantId: string
  provider: 'meta_whatsapp'
  phoneNumberId: string | null
  recipient: string | null
  clientId: string | null
}

export interface ManualWhatsAppReplyActor {
  tenantId: string
  userId: string
  staffId: string
  role: ManualWhatsAppReplyRole
}

export interface ManualWhatsAppReplyDraft {
  messageLogId: string
  outboxId: string
}

export interface ManualWhatsAppReplyDispatchResult {
  messageId: string
  occurredAt: string
  providerPayload: unknown
  deliveryStatus: Extract<ManualWhatsAppReplyDeliveryStatus, 'pending' | 'sent'>
}

export interface ManualWhatsAppReplyCoreDeps {
  getAuthenticatedUserId(): Promise<string | null>
  getRequestTenantId(): Promise<string | null>
  getConversation(conversationId: string): Promise<ManualWhatsAppReplyConversation | null>
  getAuthorizedActor(
    tenantId: string,
    userId: string,
  ): Promise<ManualWhatsAppReplyActor | null>
  findRecentDuplicate(input: {
    bodyText: string
    conversationId: string
    recipient: string
    tenantId: string
    userId: string
  }): Promise<ManualWhatsAppReplyMessage | null>
  createDraft(input: {
    bodyText: string
    clientId: string | null
    conversationId: string
    recipient: string
    tenantId: string
  }): Promise<ManualWhatsAppReplyDraft>
  dispatchMessage(input: {
    tenantId: string
    phoneNumberId: string
    recipient: string
    text: string
  }): Promise<ManualWhatsAppReplyDispatchResult>
  persistSentMessage(input: {
    actor: ManualWhatsAppReplyActor
    bodyText: string
    conversation: ManualWhatsAppReplyConversation
    deliveryStatus: Extract<ManualWhatsAppReplyDeliveryStatus, 'pending' | 'sent'>
    draft: ManualWhatsAppReplyDraft
    messageId: string
    occurredAt: string
    providerPayload: unknown
  }): Promise<ManualWhatsAppReplyMessage>
  markDispatchFailure(input: {
    draft: ManualWhatsAppReplyDraft
    errorCode: string
    errorMessage: string
  }): Promise<void>
  markPersistenceFailure(input: {
    draft: ManualWhatsAppReplyDraft
    errorMessage: string
    messageId: string
    providerPayload: unknown
  }): Promise<void>
}

export class ManualWhatsAppReplyError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly publicMessage: string

  constructor(code: string, httpStatus: number, publicMessage: string) {
    super(publicMessage)
    this.name = 'ManualWhatsAppReplyError'
    this.code = code
    this.httpStatus = httpStatus
    this.publicMessage = publicMessage
  }
}

export function isManualWhatsAppReplyError(error: unknown): error is ManualWhatsAppReplyError {
  return error instanceof ManualWhatsAppReplyError
}

export function normalizeManualWhatsAppReplyText(input: string): string {
  const normalized = input
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim()

  if (normalized.length === 0) {
    throw new ManualWhatsAppReplyError(
      'EMPTY_TEXT',
      400,
      'Scrivi un messaggio prima di inviare.',
    )
  }

  if (normalized.length > MANUAL_WHATSAPP_MESSAGE_MAX_LENGTH) {
    throw new ManualWhatsAppReplyError(
      'TEXT_TOO_LONG',
      400,
      `Il messaggio supera il limite di ${MANUAL_WHATSAPP_MESSAGE_MAX_LENGTH} caratteri.`,
    )
  }

  return normalized
}

export async function sendManualWhatsAppReplyCore(
  input: ManualWhatsAppReplyInput,
  deps: ManualWhatsAppReplyCoreDeps,
): Promise<ManualWhatsAppReplySuccess> {
  const conversationId = input.conversationId.trim()
  if (!UUID_RE.test(conversationId)) {
    throw new ManualWhatsAppReplyError(
      'INVALID_CONVERSATION_ID',
      400,
      'Conversazione non valida.',
    )
  }

  const bodyText = normalizeManualWhatsAppReplyText(input.text)

  const userId = await deps.getAuthenticatedUserId()
  if (!userId) {
    throw new ManualWhatsAppReplyError(
      'UNAUTHENTICATED',
      401,
      'Sessione non valida.',
    )
  }

  const conversation = await deps.getConversation(conversationId)
  if (!conversation) {
    throw new ManualWhatsAppReplyError(
      'CONVERSATION_NOT_FOUND',
      404,
      'Conversazione non trovata.',
    )
  }

  const requestTenantId = await deps.getRequestTenantId()
  if (requestTenantId && requestTenantId !== conversation.tenantId) {
    throw new ManualWhatsAppReplyError(
      'CROSS_TENANT_CONVERSATION',
      404,
      'Conversazione non trovata.',
    )
  }

  if (conversation.provider !== 'meta_whatsapp') {
    throw new ManualWhatsAppReplyError(
      'UNSUPPORTED_PROVIDER',
      409,
      'Questa conversazione non supporta risposte manuali.',
    )
  }

  if (!conversation.phoneNumberId) {
    throw new ManualWhatsAppReplyError(
      'PHONE_NUMBER_ID_MISSING',
      409,
      'Numero WhatsApp non configurato per questa conversazione.',
    )
  }

  if (!conversation.recipient) {
    throw new ManualWhatsAppReplyError(
      'RECIPIENT_MISSING',
      409,
      'Destinatario WhatsApp non disponibile per questa conversazione.',
    )
  }

  const actor = await deps.getAuthorizedActor(conversation.tenantId, userId)
  if (!actor) {
    throw new ManualWhatsAppReplyError(
      'FORBIDDEN',
      403,
      'Non sei autorizzato a inviare messaggi per questo salone.',
    )
  }

  const duplicate = await deps.findRecentDuplicate({
    tenantId: conversation.tenantId,
    conversationId,
    userId,
    bodyText,
    recipient: conversation.recipient,
  })
  if (duplicate) {
    return {
      ok: true,
      duplicate: true,
      message: duplicate,
    }
  }

  const draft = await deps.createDraft({
    tenantId: conversation.tenantId,
    conversationId,
    clientId: conversation.clientId,
    bodyText,
    recipient: conversation.recipient,
  })

  let dispatchResult: ManualWhatsAppReplyDispatchResult
  try {
    dispatchResult = await deps.dispatchMessage({
      tenantId: conversation.tenantId,
      phoneNumberId: conversation.phoneNumberId,
      recipient: conversation.recipient,
      text: bodyText,
    })
  } catch (error) {
    const failureMessage =
      error instanceof Error ? error.message : 'unknown_dispatch_error'

    await deps.markDispatchFailure({
      draft,
      errorCode: isManualWhatsAppReplyError(error) ? error.code : 'META_SEND_FAILED',
      errorMessage: failureMessage,
    })

    if (isManualWhatsAppReplyError(error)) {
      throw error
    }

    throw new ManualWhatsAppReplyError(
      'META_SEND_FAILED',
      502,
      'Invio WhatsApp non riuscito.',
    )
  }

  try {
    const message = await deps.persistSentMessage({
      draft,
      actor,
      conversation,
      bodyText,
      messageId: dispatchResult.messageId,
      occurredAt: dispatchResult.occurredAt,
      providerPayload: dispatchResult.providerPayload,
      deliveryStatus: dispatchResult.deliveryStatus,
    })

    return {
      ok: true,
      duplicate: false,
      message,
    }
  } catch (error) {
    const failureMessage =
      error instanceof Error ? error.message : 'unknown_persistence_error'

    await deps.markPersistenceFailure({
      draft,
      messageId: dispatchResult.messageId,
      providerPayload: dispatchResult.providerPayload,
      errorMessage: failureMessage,
    })

    throw new ManualWhatsAppReplyError(
      'MESSAGE_PERSIST_FAILED',
      500,
      'Il messaggio e stato inviato ma non e stato salvato correttamente. Verifica la conversazione prima di ritentare.',
    )
  }
}
