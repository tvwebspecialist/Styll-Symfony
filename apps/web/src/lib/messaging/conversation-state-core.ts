import type { InboxConversationStatus, InboxOwnershipMode } from './contracts'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const OWNERSHIP_OVERRIDE_ROLES = new Set<ConversationStateActorRole>([
  'owner',
  'manager',
  'receptionist',
])

export type ConversationStateActorRole = 'owner' | 'manager' | 'receptionist' | 'staff'

export type ConversationStateAction =
  | 'take_control'
  | 'human_reply'
  | 'human_message_echo'
  | 'release_control'
  | 'return_to_ai'

export interface ConversationStateActor {
  tenantId: string
  userId: string | null
  staffId: string | null
  role: ConversationStateActorRole | 'system'
  displayName: string | null
}

export interface ConversationStateSnapshot {
  conversationId: string
  tenantId: string
  status: InboxConversationStatus
  ownershipMode: InboxOwnershipMode
  assignedStaffId: string | null
  aiPausedAt: string | null
}

export interface ConversationStateTransitionInput {
  action: ConversationStateAction
  actor: ConversationStateActor
  conversation: ConversationStateSnapshot
  occurredAt: string
  reason?: string | null
}

export interface ConversationStateTransitionResult {
  changed: boolean
  action: ConversationStateAction
  summary: string | null
  from: ConversationStateSnapshot
  to: ConversationStateSnapshot
  reason: string | null
}

export interface UpdateConversationStateInput {
  conversationId: string
  action: Exclude<ConversationStateAction, 'human_reply' | 'human_message_echo'>
  reason?: string | null
}

export interface UpdateConversationStateSuccess {
  ok: true
  changed: boolean
  conversation: ConversationStateSnapshot
  actor: Pick<ConversationStateActor, 'staffId' | 'displayName' | 'role'>
}

export interface UpdateConversationStateCoreDeps {
  getAuthenticatedUserId(): Promise<string | null>
  getRequestTenantId(): Promise<string | null>
  getConversation(conversationId: string): Promise<ConversationStateSnapshot | null>
  getAuthorizedActor(
    tenantId: string,
    userId: string,
  ): Promise<ConversationStateActor | null>
  applyTransition(
    input: ConversationStateTransitionInput,
  ): Promise<ConversationStateTransitionResult>
}

export class ConversationStateError extends Error {
  readonly code: string
  readonly httpStatus: number
  readonly publicMessage: string

  constructor(code: string, httpStatus: number, publicMessage: string) {
    super(publicMessage)
    this.name = 'ConversationStateError'
    this.code = code
    this.httpStatus = httpStatus
    this.publicMessage = publicMessage
  }
}

export function isConversationStateError(error: unknown): error is ConversationStateError {
  return error instanceof ConversationStateError
}

function normalizeReason(reason: string | null | undefined): string | null {
  const normalized = reason?.trim() ?? ''
  return normalized.length > 0 ? normalized : null
}

function isOverrideAllowed(role: ConversationStateActorRole): boolean {
  return OWNERSHIP_OVERRIDE_ROLES.has(role)
}

function isSystemActor(actor: ConversationStateActor): boolean {
  return actor.role === 'system'
}

function assertStaffActor(actor: ConversationStateActor): asserts actor is ConversationStateActor & {
  userId: string
  staffId: string
  role: ConversationStateActorRole
} {
  if (!actor.userId || !actor.staffId || isSystemActor(actor)) {
    throw new ConversationStateError(
      'INVALID_ACTOR',
      409,
      'Attore conversazione non valido.',
    )
  }
}

function assertConversationMutable(conversation: ConversationStateSnapshot) {
  if (conversation.status === 'closed') {
    throw new ConversationStateError(
      'CONVERSATION_CLOSED',
      409,
      'La conversazione e chiusa e non puo essere modificata.',
    )
  }
}

function assertActorCanControlConversation(
  conversation: ConversationStateSnapshot,
  actor: ConversationStateActor,
) {
  if (isSystemActor(actor)) {
    return
  }

  assertStaffActor(actor)

  if (conversation.tenantId !== actor.tenantId) {
    throw new ConversationStateError(
      'FORBIDDEN',
      403,
      'Non sei autorizzato a modificare questa conversazione.',
    )
  }

  if (
    conversation.assignedStaffId
    && conversation.assignedStaffId !== actor.staffId
    && !isOverrideAllowed(actor.role)
  ) {
    throw new ConversationStateError(
      'OWNERSHIP_CONFLICT',
      409,
      'La conversazione e gia assegnata a un altro operatore.',
    )
  }
}

function buildSummary(
  action: ConversationStateAction,
  actor: ConversationStateActor,
  reason: string | null,
): string {
  const name = actor.displayName?.trim() || (isSystemActor(actor) ? 'WhatsApp Business App' : 'Un operatore')
  const base =
    action === 'take_control'
      ? `${name} ha preso in carico la conversazione.`
      : action === 'human_reply'
        ? `${name} ha attivato il presidio umano.`
        : action === 'human_message_echo'
          ? `${name} ha inviato un messaggio fuori dashboard e ha messo in pausa l'AI.`
        : action === 'release_control'
          ? `${name} ha rilasciato la conversazione.`
          : `${name} ha restituito la conversazione all'AI.`

  return reason ? `${base} Motivo: ${reason}` : base
}

function cloneConversation(
  snapshot: ConversationStateSnapshot,
  updates: Partial<ConversationStateSnapshot>,
): ConversationStateSnapshot {
  return {
    ...snapshot,
    ...updates,
  }
}

export function transitionConversationState(
  input: ConversationStateTransitionInput,
): ConversationStateTransitionResult {
  assertConversationMutable(input.conversation)
  assertActorCanControlConversation(input.conversation, input.actor)

  const reason = normalizeReason(input.reason)
  const current = input.conversation

  let next = current

  switch (input.action) {
    case 'take_control': {
      assertStaffActor(input.actor)

      const alreadyOwned =
        current.assignedStaffId === input.actor.staffId
        && current.ownershipMode === 'human'
        && (current.status === 'human_assigned' || current.status === 'human_active')

      if (alreadyOwned) {
        return {
          changed: false,
          action: input.action,
          summary: null,
          from: current,
          to: current,
          reason,
        }
      }

      next = cloneConversation(current, {
        assignedStaffId: input.actor.staffId,
        ownershipMode: 'human',
        status: 'human_assigned',
        aiPausedAt:
          current.ownershipMode === 'human' && current.aiPausedAt
            ? current.aiPausedAt
            : input.occurredAt,
      })
      break
    }

    case 'human_reply': {
      assertStaffActor(input.actor)

      const alreadyActive =
        current.assignedStaffId === input.actor.staffId
        && current.ownershipMode === 'human'
        && current.status === 'human_active'

      if (alreadyActive) {
        return {
          changed: false,
          action: input.action,
          summary: null,
          from: current,
          to: current,
          reason,
        }
      }

      next = cloneConversation(current, {
        assignedStaffId: input.actor.staffId,
        ownershipMode: 'human',
        status: 'human_active',
        aiPausedAt:
          current.ownershipMode === 'human' && current.aiPausedAt
            ? current.aiPausedAt
            : input.occurredAt,
      })
      break
    }

    case 'human_message_echo': {
      const alreadyEchoAligned =
        current.status === 'human_active'
        && current.ownershipMode === 'human'
        && current.aiPausedAt !== null

      if (alreadyEchoAligned) {
        return {
          changed: false,
          action: input.action,
          summary: null,
          from: current,
          to: current,
          reason,
        }
      }

      next = cloneConversation(current, {
        assignedStaffId: current.assignedStaffId,
        ownershipMode: 'human',
        status: 'human_active',
        aiPausedAt: current.aiPausedAt ?? input.occurredAt,
      })
      break
    }

    case 'release_control': {
      assertStaffActor(input.actor)

      const alreadyReleased =
        current.assignedStaffId === null
        && current.ownershipMode === 'hybrid'
        && current.status === 'ai_paused'

      if (alreadyReleased) {
        return {
          changed: false,
          action: input.action,
          summary: null,
          from: current,
          to: current,
          reason,
        }
      }

      const isHumanOwned =
        current.assignedStaffId !== null
        || current.ownershipMode === 'human'
        || current.status === 'human_assigned'
        || current.status === 'human_active'

      if (!isHumanOwned) {
        throw new ConversationStateError(
          'INVALID_TRANSITION',
          409,
          'La conversazione non e attualmente presa in carico da un operatore.',
        )
      }

      next = cloneConversation(current, {
        assignedStaffId: null,
        ownershipMode: 'hybrid',
        status: 'ai_paused',
        aiPausedAt: input.occurredAt,
      })
      break
    }

    case 'return_to_ai': {
      assertStaffActor(input.actor)

      const alreadyReturned =
        current.assignedStaffId === null
        && current.ownershipMode === 'ai'
        && current.status === 'ai_active'
        && current.aiPausedAt === null

      if (alreadyReturned) {
        return {
          changed: false,
          action: input.action,
          summary: null,
          from: current,
          to: current,
          reason,
        }
      }

      const canReturn =
        current.assignedStaffId !== null
        || current.ownershipMode !== 'ai'
        || current.aiPausedAt !== null
        || current.status === 'ai_paused'

      if (!canReturn) {
        throw new ConversationStateError(
          'INVALID_TRANSITION',
          409,
          'La conversazione non e in uno stato compatibile con il ritorno all\'AI.',
        )
      }

      next = cloneConversation(current, {
        assignedStaffId: null,
        ownershipMode: 'ai',
        status: 'ai_active',
        aiPausedAt: null,
      })
      break
    }
  }

  return {
    changed: true,
    action: input.action,
    summary: buildSummary(input.action, input.actor, reason),
    from: current,
    to: next,
    reason,
  }
}

export async function updateConversationStateCore(
  input: UpdateConversationStateInput,
  deps: UpdateConversationStateCoreDeps,
): Promise<UpdateConversationStateSuccess> {
  const conversationId = input.conversationId.trim()
  if (!UUID_RE.test(conversationId)) {
    throw new ConversationStateError(
      'INVALID_CONVERSATION_ID',
      400,
      'Conversazione non valida.',
    )
  }

  const userId = await deps.getAuthenticatedUserId()
  if (!userId) {
    throw new ConversationStateError(
      'UNAUTHENTICATED',
      401,
      'Sessione non valida.',
    )
  }

  const conversation = await deps.getConversation(conversationId)
  if (!conversation) {
    throw new ConversationStateError(
      'CONVERSATION_NOT_FOUND',
      404,
      'Conversazione non trovata.',
    )
  }

  const requestTenantId = await deps.getRequestTenantId()
  if (requestTenantId && requestTenantId !== conversation.tenantId) {
    throw new ConversationStateError(
      'CROSS_TENANT_CONVERSATION',
      404,
      'Conversazione non trovata.',
    )
  }

  const actor = await deps.getAuthorizedActor(conversation.tenantId, userId)
  if (!actor) {
    throw new ConversationStateError(
      'FORBIDDEN',
      403,
      'Non sei autorizzato a modificare questa conversazione.',
    )
  }

  const result = await deps.applyTransition({
    action: input.action,
    actor,
    conversation,
    occurredAt: new Date().toISOString(),
    reason: input.reason,
  })

  return {
    ok: true,
    changed: result.changed,
    conversation: result.to,
    actor: {
      staffId: actor.staffId,
      displayName: actor.displayName,
      role: actor.role,
    },
  }
}
