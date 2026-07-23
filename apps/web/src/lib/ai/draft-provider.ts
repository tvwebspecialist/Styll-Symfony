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
    | 'conversation_memory'
    | 'tenant_profile'
    | 'services'
    | 'working_hours'
    | 'custom_faqs'
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
  'greeting',
  'pricing',
  'opening_hours',
  'booking',
  'reschedule',
  'cancel',
  'faq',
  'human_request',
  'complaint',
  'conversational_followup',
  'unknown',
] as const

export type AiDraftIntent = (typeof AI_DRAFT_INTENTS)[number]

export interface AiConversationUnderstandingEntities {
  service: string | null
  requestedDate: string | null
  requestedTime: string | null
  appointmentReference: string | null
  customerName: string | null
  customerNotes: string | null
}

export interface AiConversationUnderstandingCorrections {
  replacesService: boolean
  replacesDate: boolean
  replacesTime: boolean
}

export interface AiConversationUnderstanding {
  intent: AiDraftIntent
  confidence: number | null
  handoff: boolean
  entities: AiConversationUnderstandingEntities
  corrections: AiConversationUnderstandingCorrections
  citedSources: string[]
  requestedToolCalls: AiDraftToolCall[]
}

export type ReceptionistConversationGoal = 'booking' | 'reschedule' | 'cancel' | null

export interface AvailabilitySlot {
  date: string
  startTime: string
  endTime: string
  staffIds: string[]
}

export interface AvailabilityGatewayFindInput {
  tenantId: string
  serviceId: string
  requestedDate: string
  preferredTime?: string | null
}

export interface AvailabilityGatewayLookup {
  serviceId: string
  requestedDate: string
  timezone: string
  serviceAvailable: boolean
  businessOpen: boolean
  preferredTimeWithinBusinessHours: boolean | null
  slots: AvailabilitySlot[]
}

export type AvailabilityResultReason =
  | 'available'
  | 'slot_unavailable'
  | 'business_closed'
  | 'service_unavailable'

export interface AvailabilityResult {
  available: boolean
  requestedSlot: AvailabilitySlot | null
  suggestedSlots: AvailabilitySlot[]
  reason: AvailabilityResultReason
}

export type ReceptionistConversationStateField =
  | 'service'
  | 'requestedDate'
  | 'requestedTime'
  | 'appointmentReference'

export interface ReceptionistConversationState {
  activeGoal: ReceptionistConversationGoal
  service: string | null
  requestedDate: string | null
  requestedTime: string | null
  appointmentReference: string | null
  customerName: string | null
  customerNotes: string | null
  missingFields: ReceptionistConversationStateField[]
  nextQuestion: string | null
  lastIntent: AiDraftIntent | null
  updatedFromMessageId: string | null
}

export type AppointmentPreparationField =
  | 'service'
  | 'requested_date'
  | 'requested_time'
  | 'current_appointment_reference'

export type AppointmentPlannerState =
  | 'not_applicable'
  | 'appointment_missing_service'
  | 'appointment_missing_date'
  | 'appointment_missing_time'
  | 'availability_available'
  | 'availability_unavailable'
  | 'availability_business_closed'
  | 'availability_missing_information'
  | 'appointment_complete'

export interface AppointmentResolvedService {
  id: string
  name: string
  raw: string
  sourceMessageId: string
}

export interface AppointmentResolvedDate {
  isoDate: string
  raw: string
  sourceMessageId: string
}

export interface AppointmentResolvedTime {
  normalizedTime: string
  raw: string
  sourceMessageId: string
}

export interface AppointmentPreparedToolCall {
  name:
    | 'prepare_booking_sandbox'
    | 'prepare_appointment'
    | 'prepare_reschedule'
    | 'prepare_cancellation'
  arguments: {
    service?: string
    requested_date?: string
    requested_time?: string
    selected_slot?: string
    customer_name?: string | null
    current_appointment_reference?: string
    customer_notes: string
    conversation_summary: string
  }
}

export interface AppointmentPlannerMemory {
  state: AppointmentPlannerState
  action: 'booking' | 'reschedule' | 'cancellation' | null
  completeFields: AppointmentPreparationField[]
  missingFields: AppointmentPreparationField[]
  nextQuestion: string | null
  service: AppointmentResolvedService | null
  requestedDate: AppointmentResolvedDate | null
  requestedTime: AppointmentResolvedTime | null
  currentAppointmentReference: string | null
  preferredWindow: string | null
  customerNotes: string | null
  conversationSummary: string | null
  preparedToolCall: AppointmentPreparedToolCall | null
}

export interface InboxConversationMemory {
  latestIntent: AiDraftIntent
  activeIntent: 'booking' | 'reschedule' | 'cancel' | null
  lastService: AppointmentResolvedService | null
  lastDate: AppointmentResolvedDate | null
  lastTime: AppointmentResolvedTime | null
  lastAppointmentReference: string | null
  lastMissingSlot: AppointmentPreparationField | null
  planner: AppointmentPlannerMemory | null
}

export const INBOX_AI_RECEPTIONIST_MODES = [
  'disabled',
  'draft_only',
  'supervised',
  'autonomous_faq',
] as const

export type InboxAiReceptionistMode = (typeof INBOX_AI_RECEPTIONIST_MODES)[number]

export const INBOX_AI_CUSTOM_FAQ_TOPICS = [
  'payment_methods',
  'parking',
  'late_arrival',
  'cancellation_policy',
  'accessibility',
  'location_instructions',
] as const

export type InboxAiCustomFaqTopic = (typeof INBOX_AI_CUSTOM_FAQ_TOPICS)[number]

export interface InboxAiCustomFaqEntry {
  topic: InboxAiCustomFaqTopic
  answer: string
  enabled: boolean
}

export interface InboxAiReceptionistConfig {
  mode: InboxAiReceptionistMode
  autoReplyConfidenceThreshold: number
  handoffConfidenceThreshold: number
  allowedAutonomousIntents: AiDraftIntent[]
  preferredTone: string | null
  greetingStyle: string | null
  escalationInstructions: string | null
  customFaqs: InboxAiCustomFaqEntry[]
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
    price: number | null
    durationMinutes: number
  }>
  customFaqCatalog: InboxAiCustomFaqEntry[]
  conversationMemory: InboxConversationMemory
  receptionistState: ReceptionistConversationState
}

export interface AiDraftResponse {
  draftText: string
  confidence: number | null
  intent: AiDraftIntent
  handoff: boolean
  understanding: AiConversationUnderstanding
  internalReasoning: string | null
  citedSources: string[]
  requestedToolCalls: AiDraftToolCall[]
  providerRunId: string | null
}

export interface AiDraftProvider {
  providerId: string
  generateDraft(input: AiDraftRequest): Promise<AiDraftResponse>
}
