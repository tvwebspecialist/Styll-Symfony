import type {
  InboxConversationStatus,
  InboxOwnershipMode,
  InboxToolName,
} from '../messaging/contracts.ts'

export interface AiDraftMessage {
  id: string
  author: 'assistant' | 'customer' | 'human' | 'system'
  text: string
  createdAt: string
  sourceRef: string
}

export interface AiDraftSource {
  kind: 'conversation' | 'knowledge' | 'policy' | 'tool_result'
  label: string
  ref: string
}

export interface AiDraftContextSection {
  key:
    | 'conversation_state'
    | 'tenant_profile'
    | 'services'
    | 'working_hours'
    | 'tool_policies'
  title: string
  text: string
  sourceRefs: string[]
}

export interface AiDraftToolCall {
  name: InboxToolName
  arguments: Record<string, unknown>
}

export const AI_DRAFT_INTENTS = [
  'faq',
  'greeting',
  'appointment_booking',
  'appointment_change',
  'appointment_cancel',
  'pricing',
  'opening_hours',
  'human_request',
  'complaint',
  'unknown',
] as const

export type AiDraftIntent = (typeof AI_DRAFT_INTENTS)[number]

export const INBOX_AI_RECEPTIONIST_MODES = [
  'disabled',
  'draft_only',
  'supervised',
  'autonomous_faq',
] as const

export type InboxAiReceptionistMode = (typeof INBOX_AI_RECEPTIONIST_MODES)[number]

export interface InboxAiReceptionistConfig {
  mode: InboxAiReceptionistMode
  autoReplyConfidenceThreshold: number
  handoffConfidenceThreshold: number
  allowedAutonomousIntents: AiDraftIntent[]
  preferredTone: string | null
  greetingStyle: string | null
  escalationInstructions: string | null
}

export interface AiDraftRequest {
  tenantId: string
  conversationId: string
  promptId: string
  promptVersion: string
  systemPrompt: string
  messages: AiDraftMessage[]
  contextSections: AiDraftContextSection[]
  sources: AiDraftSource[]
  allowedTools: InboxToolName[]
}

export interface PreparedInboxDraftRequest extends AiDraftRequest {
  conversationState: {
    status: InboxConversationStatus
    ownershipMode: InboxOwnershipMode
    aiPausedAt: string | null
    clientId: string | null
  }
  tenantProfile: {
    businessName: string
    timezone: string
  }
  receptionistConfig: InboxAiReceptionistConfig
  serviceCatalog: Array<{
    id: string
    name: string
    price: number
    durationMinutes: number
  }>
}

export interface AiDraftResponse {
  draftText: string
  confidence: number | null
  intent: AiDraftIntent
  handoff: boolean
  internalReasoning: string | null
  citedSources: string[]
  requestedToolCalls: AiDraftToolCall[]
  providerRunId: string | null
}

export interface AiDraftProvider {
  providerId: string
  generateDraft(input: AiDraftRequest): Promise<AiDraftResponse>
}
