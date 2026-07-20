import type { ManualWhatsAppReplyRole } from './manual-whatsapp-reply-core.ts'

export const MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS = 3

const RETRY_DELAYS_MS = [60_000, 5 * 60_000] as const

const NON_RETRYABLE_ERROR_CODES = new Set([
  'CONVERSATION_NOT_FOUND',
  'INVALID_OUTBOX_PAYLOAD',
  'META_MISSING_MESSAGE_ID',
  'PHONE_NUMBER_ID_MISSING',
  'RECIPIENT_MISSING',
  'UNSUPPORTED_PROVIDER',
  'WHATSAPP_INTEGRATION_INACTIVE',
  'WHATSAPP_NOT_CONFIGURED',
])

export interface ManualInboxOutboxPayload {
  source: 'dashboard_manual_inbox'
  type: 'text'
  text: string
  phone_number_id: string
  actor: {
    user_id: string
    staff_id: string
    role: ManualWhatsAppReplyRole
    display_name: string | null
  }
  provider_result?: {
    message_id: string
    occurred_at: string
    delivery_status: 'pending' | 'sent'
    provider_payload: unknown
  }
}

export interface ManualOutboxRetryPlan {
  deadLetter: boolean
  scheduledFor: string | null
  status: 'pending' | 'failed'
}

export function isRetryableManualWhatsAppOutboxError(code: string): boolean {
  return !NON_RETRYABLE_ERROR_CODES.has(code)
}

export function planManualWhatsAppOutboxRetry(input: {
  attempts: number
  errorCode: string
  now?: Date
}): ManualOutboxRetryPlan {
  if (!isRetryableManualWhatsAppOutboxError(input.errorCode)) {
    return {
      deadLetter: true,
      scheduledFor: null,
      status: 'failed',
    }
  }

  if (input.attempts >= MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS) {
    return {
      deadLetter: true,
      scheduledFor: null,
      status: 'failed',
    }
  }

  const now = input.now ?? new Date()
  const delayMs = RETRY_DELAYS_MS[Math.min(input.attempts - 1, RETRY_DELAYS_MS.length - 1)] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]

  return {
    deadLetter: false,
    scheduledFor: new Date(now.getTime() + delayMs).toISOString(),
    status: 'pending',
  }
}

function isObjectRecord(input: unknown): input is Record<string, unknown> {
  return !!input && typeof input === 'object' && !Array.isArray(input)
}

function isReplyRole(input: unknown): input is ManualWhatsAppReplyRole {
  return input === 'owner' || input === 'manager' || input === 'receptionist' || input === 'staff'
}

export function parseManualInboxOutboxPayload(input: unknown): ManualInboxOutboxPayload | null {
  if (!isObjectRecord(input)) return null

  if (input.source !== 'dashboard_manual_inbox' || input.type !== 'text') {
    return null
  }

  if (typeof input.text !== 'string' || input.text.trim().length === 0) {
    return null
  }

  if (typeof input.phone_number_id !== 'string' || input.phone_number_id.trim().length === 0) {
    return null
  }

  if (!isObjectRecord(input.actor)) {
    return null
  }

  if (
    typeof input.actor.user_id !== 'string'
    || input.actor.user_id.trim().length === 0
    || typeof input.actor.staff_id !== 'string'
    || input.actor.staff_id.trim().length === 0
    || !isReplyRole(input.actor.role)
  ) {
    return null
  }

  if (
    input.actor.display_name !== null
    && input.actor.display_name !== undefined
    && typeof input.actor.display_name !== 'string'
  ) {
    return null
  }

  let providerResult: ManualInboxOutboxPayload['provider_result']
  if (input.provider_result !== undefined) {
    if (!isObjectRecord(input.provider_result)) {
      return null
    }

    if (
      typeof input.provider_result.message_id !== 'string'
      || input.provider_result.message_id.trim().length === 0
      || typeof input.provider_result.occurred_at !== 'string'
      || input.provider_result.occurred_at.trim().length === 0
      || (input.provider_result.delivery_status !== 'pending' && input.provider_result.delivery_status !== 'sent')
    ) {
      return null
    }

    providerResult = {
      message_id: input.provider_result.message_id,
      occurred_at: input.provider_result.occurred_at,
      delivery_status: input.provider_result.delivery_status,
      provider_payload: input.provider_result.provider_payload ?? null,
    }
  }

  return {
    source: 'dashboard_manual_inbox',
    type: 'text',
    text: input.text,
    phone_number_id: input.phone_number_id,
    actor: {
      user_id: input.actor.user_id,
      staff_id: input.actor.staff_id,
      role: input.actor.role,
      display_name: typeof input.actor.display_name === 'string' ? input.actor.display_name : null,
    },
    provider_result: providerResult,
  }
}
