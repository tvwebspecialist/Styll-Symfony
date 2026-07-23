export type MessagingChannel = 'whatsapp'

export type MessagingProvider = 'meta_whatsapp'

export type InboxConversationStatus =
  | 'new'
  | 'ai_active'
  | 'ai_draft_only'
  | 'waiting_customer_input'
  | 'waiting_customer_confirmation'
  | 'waiting_staff_approval'
  | 'human_requested'
  | 'human_assigned'
  | 'human_active'
  | 'ai_paused'
  | 'resolved'
  | 'closed'

export type InboxOwnershipMode = 'ai' | 'human' | 'hybrid'

export type InboxAuthorKind = 'customer' | 'assistant' | 'human' | 'system'

export type InboxToolName =
  | 'get_business_info'
  | 'get_services'
  | 'get_prices'
  | 'get_working_hours'
  | 'search_availability'
  | 'prepare_booking_sandbox'
  | 'prepare_appointment'
  | 'confirm_appointment'
  | 'prepare_reschedule'
  | 'confirm_reschedule'
  | 'prepare_cancellation'
  | 'confirm_cancellation'
  | 'get_loyalty_summary'
  | 'request_human_handoff'
  | 'add_internal_note'
  | 'apply_discount'
  | 'waive_penalty'
  | 'refund'
  | 'delete_customer'
  | 'change_role'
  | 'bulk_campaign'

export type ToolPolicyDecision =
  | 'allow'
  | 'ask_customer'
  | 'ask_staff'
  | 'ask_owner'
  | 'deny_ai'

export interface NormalizedWebhookEvent {
  provider: MessagingProvider
  eventId: string
  eventType: string
  occurredAt: string
  phoneNumberId: string
  conversationKey: string
  externalContactId: string
  contactPhone: string | null
  contactDisplayName: string | null
  messageId: string | null
  direction: 'inbound' | 'outbound' | 'system'
  authorKind: InboxAuthorKind
  text: string | null
  media: Array<{
    kind: 'image' | 'video' | 'audio' | 'document' | 'unknown'
    url?: string
    mimeType?: string
    sha256?: string
  }>
  rawPayload: unknown
}

export interface NormalizedOutboundMessage {
  channel: MessagingChannel
  provider: MessagingProvider
  conversationKey: string
  recipient: string
  text: string
  templateName?: string
  templateLocale?: string
  metadata?: Record<string, unknown>
}

export interface MessagingProviderAdapter {
  provider: MessagingProvider
  normalizeWebhook(input: unknown): NormalizedWebhookEvent[]
  buildOutboundRequest(message: NormalizedOutboundMessage): unknown
}

export interface ConversationSnapshot {
  tenantId: string
  conversationId: string
  status: InboxConversationStatus
  ownershipMode: InboxOwnershipMode
  unreadCount: number
  serviceWindowExpiresAt: string | null
  aiPausedAt: string | null
  assignedStaffId: string | null
}
