import type { MessagingProviderAdapter, NormalizedWebhookEvent } from './contracts'
import { buildConversationKey } from './provider-adapter.ts'

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string
      value?: MetaWebhookValue
    }>
  }>
}

type MetaWebhookValue = {
  contacts?: Array<{
    profile?: { name?: string }
    wa_id?: string
  }>
  message_echoes?: Array<MetaEchoMessage>
  messages?: Array<MetaIncomingMessage>
  metadata?: {
    display_phone_number?: string
    phone_number_id?: string
  }
  statuses?: Array<MetaStatusMessage>
}

type MetaMessagePayload = {
  button?: { text?: string }
  document?: MetaMedia
  id?: string
  image?: MetaMedia
  interactive?: {
    button_reply?: { title?: string }
    list_reply?: { title?: string }
  }
  text?: { body?: string }
  timestamp?: string
  type?: string
  video?: MetaMedia
  audio?: MetaMedia
}

type MetaIncomingMessage = MetaMessagePayload & {
  from?: string
}

type MetaEchoMessage = MetaMessagePayload & {
  from?: string
  to?: string
  to_user_id?: string
  to_parent_user_id?: string
}

type MetaStatusMessage = {
  conversation?: unknown
  id?: string
  recipient_id?: string
  status?: string
  timestamp?: string
}

type MetaMedia = {
  id?: string
  mime_type?: string
  sha256?: string
}

function toIsoTimestamp(input: string | undefined): string {
  const seconds = Number(input)
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1000).toISOString()
  }

  return new Date().toISOString()
}

function extractMessageText(message: MetaMessagePayload): string | null {
  if (typeof message.text?.body === 'string' && message.text.body.trim().length > 0) {
    return message.text.body.trim()
  }
  if (typeof message.button?.text === 'string' && message.button.text.trim().length > 0) {
    return message.button.text.trim()
  }
  if (
    typeof message.interactive?.button_reply?.title === 'string' &&
    message.interactive.button_reply.title.trim().length > 0
  ) {
    return message.interactive.button_reply.title.trim()
  }
  if (
    typeof message.interactive?.list_reply?.title === 'string' &&
    message.interactive.list_reply.title.trim().length > 0
  ) {
    return message.interactive.list_reply.title.trim()
  }

  return null
}

function extractMedia(message: MetaMessagePayload): NormalizedWebhookEvent['media'] {
  const media: NormalizedWebhookEvent['media'] = []
  const candidates: Array<{ kind: NormalizedWebhookEvent['media'][number]['kind']; payload?: MetaMedia }> = [
    { kind: 'image', payload: message.image },
    { kind: 'video', payload: message.video },
    { kind: 'audio', payload: message.audio },
    { kind: 'document', payload: message.document },
  ]

  for (const candidate of candidates) {
    if (!candidate.payload) continue
    media.push({
      kind: candidate.kind,
      url: candidate.payload.id,
      mimeType: candidate.payload.mime_type,
      sha256: candidate.payload.sha256,
    })
  }

  return media
}

function extractEchoContactId(message: MetaEchoMessage): string | null {
  const candidates = [
    message.to?.trim(),
    message.to_user_id?.trim(),
    message.to_parent_user_id?.trim(),
  ]

  return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) ?? null
}

function toContactPhone(candidate: string | null): string | null {
  if (!candidate) return null
  return /^[0-9+]+$/.test(candidate) ? candidate : null
}

function normalizeMessageEvents(value: MetaWebhookValue): NormalizedWebhookEvent[] {
  const phoneNumberId = value.metadata?.phone_number_id?.trim()
  if (!phoneNumberId || !Array.isArray(value.messages) || value.messages.length === 0) {
    return []
  }

  const contactNames = new Map<string, string>()
  for (const contact of value.contacts ?? []) {
    const waId = contact.wa_id?.trim()
    const displayName = contact.profile?.name?.trim()
    if (waId && displayName) {
      contactNames.set(waId, displayName)
    }
  }

  return value.messages.flatMap((message) => {
    const externalContactId = message.from?.trim()
    const messageId = message.id?.trim() ?? null
    if (!externalContactId || !messageId) return []

    return [{
      provider: 'meta_whatsapp',
      eventId: `message:${messageId}`,
      eventType: 'message.received',
      occurredAt: toIsoTimestamp(message.timestamp),
      phoneNumberId,
      conversationKey: buildConversationKey('meta_whatsapp', phoneNumberId, externalContactId),
      externalContactId,
      contactPhone: externalContactId,
      contactDisplayName: contactNames.get(externalContactId) ?? null,
      messageId,
      direction: 'inbound',
      authorKind: 'customer',
      text: extractMessageText(message),
      media: extractMedia(message),
      rawPayload: message,
    }]
  })
}

function normalizeStatusEvents(value: MetaWebhookValue): NormalizedWebhookEvent[] {
  const phoneNumberId = value.metadata?.phone_number_id?.trim()
  if (!phoneNumberId || !Array.isArray(value.statuses) || value.statuses.length === 0) {
    return []
  }

  return value.statuses.flatMap((status) => {
    const externalContactId = status.recipient_id?.trim()
    const messageId = status.id?.trim() ?? null
    const statusName = status.status?.trim().toLowerCase()
    if (!externalContactId || !messageId || !statusName) return []

    return [{
      provider: 'meta_whatsapp',
      eventId: `status:${messageId}:${statusName}:${status.timestamp ?? '0'}`,
      eventType: `message.${statusName}`,
      occurredAt: toIsoTimestamp(status.timestamp),
      phoneNumberId,
      conversationKey: buildConversationKey('meta_whatsapp', phoneNumberId, externalContactId),
      externalContactId,
      contactPhone: externalContactId,
      contactDisplayName: null,
      messageId,
      direction: 'outbound',
      authorKind: 'system',
      text: null,
      media: [],
      rawPayload: status,
    }]
  })
}

function normalizeMessageEchoEvents(value: MetaWebhookValue): NormalizedWebhookEvent[] {
  const phoneNumberId = value.metadata?.phone_number_id?.trim()
  if (!phoneNumberId || !Array.isArray(value.message_echoes) || value.message_echoes.length === 0) {
    return []
  }

  return value.message_echoes.flatMap((message) => {
    const externalContactId = extractEchoContactId(message)
    const messageId = message.id?.trim() ?? null
    if (!externalContactId || !messageId) return []

    return [{
      provider: 'meta_whatsapp',
      eventId: `echo:${messageId}`,
      eventType: 'message.echoed',
      occurredAt: toIsoTimestamp(message.timestamp),
      phoneNumberId,
      conversationKey: buildConversationKey('meta_whatsapp', phoneNumberId, externalContactId),
      externalContactId,
      contactPhone: toContactPhone(message.to?.trim() ?? null),
      contactDisplayName: null,
      messageId,
      direction: 'outbound',
      authorKind: 'human',
      text: extractMessageText(message),
      media: extractMedia(message),
      rawPayload: message,
    }]
  })
}

export const metaWhatsAppAdapter: MessagingProviderAdapter = {
  provider: 'meta_whatsapp',
  normalizeWebhook(input: unknown): NormalizedWebhookEvent[] {
    const payload = input as MetaWebhookPayload | null
    if (!payload || !Array.isArray(payload.entry)) return []

    const normalized: NormalizedWebhookEvent[] = []

    for (const entry of payload.entry) {
      for (const change of entry.changes ?? []) {
        if (!change.value) continue

        if (change.field === 'messages') {
          normalized.push(...normalizeMessageEvents(change.value))
          normalized.push(...normalizeStatusEvents(change.value))
          continue
        }

        if (change.field === 'smb_message_echoes') {
          normalized.push(...normalizeMessageEchoEvents(change.value))
        }
      }
    }

    return normalized
  },
  buildOutboundRequest(message) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: message.recipient,
      type: 'text',
      text: {
        preview_url: false,
        body: message.text,
      },
    }
  },
}

export function normalizeMetaWhatsAppWebhook(input: unknown): NormalizedWebhookEvent[] {
  return metaWhatsAppAdapter.normalizeWebhook(input)
}
