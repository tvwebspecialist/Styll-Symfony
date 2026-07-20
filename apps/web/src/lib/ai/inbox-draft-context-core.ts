import type {
  InboxConversationStatus,
  InboxOwnershipMode,
} from '../messaging/contracts.ts'
import type { InboxAiReceptionistConfig } from './draft-provider.ts'
import {
  getInboxDraftPromptDefinition,
  listInboxDraftAllowedToolDefinitions,
  listInboxDraftAllowedTools,
  renderInboxDraftSystemPrompt,
} from './prompt-registry.ts'
import type {
  AiDraftContextSection,
  AiDraftMessage,
  AiDraftSource,
  PreparedInboxDraftRequest,
} from './draft-provider.ts'

const DAY_NAMES = [
  'domenica',
  'lunedi',
  'martedi',
  'mercoledi',
  'giovedi',
  'venerdi',
  'sabato',
] as const

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi
const PHONE_PATTERN = /(?<!\w)\+?\d[\d\s().-]{5,}\d(?!\w)/g

export type InboxDraftPreparationErrorCode =
  | 'CONVERSATION_NOT_FOUND'
  | 'TENANT_NOT_FOUND'
  | 'CROSS_TENANT_RESOURCE'
  | 'DRAFT_CONTEXT_QUERY_FAILED'

export class InboxDraftPreparationError extends Error {
  code: InboxDraftPreparationErrorCode
  httpStatus: number

  constructor(
    code: InboxDraftPreparationErrorCode,
    message: string,
    httpStatus = 400,
  ) {
    super(message)
    this.name = 'InboxDraftPreparationError'
    this.code = code
    this.httpStatus = httpStatus
  }
}

export interface InboxDraftConversationRecord {
  id: string
  tenantId: string
  status: InboxConversationStatus
  ownershipMode: InboxOwnershipMode
  aiPausedAt: string | null
  clientId: string | null
}

export interface InboxDraftTenantRecord {
  id: string
  businessName: string
  tagline: string | null
  description: string | null
  timezone: string
  receptionistConfig: InboxAiReceptionistConfig
}

export interface InboxDraftServiceRecord {
  id: string
  name: string
  description: string | null
  price: number
  durationMinutes: number
  displayOrder: number
}

export interface InboxDraftWorkingHoursRecord {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
}

export interface InboxDraftMessageRecord {
  id: string
  authorKind: AiDraftMessage['author']
  bodyText: string | null
  createdAt: string
}

export interface BuildInboxDraftRequestInput {
  tenantId: string
  conversationId: string
  conversation: InboxDraftConversationRecord
  tenant: InboxDraftTenantRecord
  services: InboxDraftServiceRecord[]
  workingHours: InboxDraftWorkingHoursRecord[]
  messages: InboxDraftMessageRecord[]
}

function normalizeInlineWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function clipText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3).trimEnd()}...`
}

function sanitizeOptionalText(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  if (typeof value !== 'string') return null

  const collapsed = value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(normalizeInlineWhitespace)
    .filter(Boolean)
    .join(' ')
    .replace(EMAIL_PATTERN, '[redacted email]')
    .replace(PHONE_PATTERN, '[redacted phone]')

  if (collapsed.length === 0) return null
  return clipText(collapsed, maxLength)
}

function formatPrice(value: number): string {
  const normalized = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2)
  return `EUR ${normalized}`
}

function authorLabel(author: AiDraftMessage['author']): string {
  switch (author) {
    case 'assistant':
      return 'assistant'
    case 'human':
      return 'human'
    case 'system':
      return 'system'
    default:
      return 'customer'
  }
}

function pushUniqueSource(sources: AiDraftSource[], source: AiDraftSource) {
  if (sources.some((entry) => entry.ref === source.ref)) return
  sources.push(source)
}

function pushUniqueSourceRef(sourceRefs: string[], sourceRef: string) {
  if (sourceRefs.includes(sourceRef)) return
  sourceRefs.push(sourceRef)
}

export function compareInboxDraftMessages(
  left: InboxDraftMessageRecord,
  right: InboxDraftMessageRecord,
): number {
  if (left.createdAt === right.createdAt) {
    return left.id.localeCompare(right.id)
  }

  return left.createdAt.localeCompare(right.createdAt)
}

export function selectInboxDraftMessageWindow(
  messages: InboxDraftMessageRecord[],
): InboxDraftMessageRecord[] {
  const promptDefinition = getInboxDraftPromptDefinition()

  return [...messages]
    .sort(compareInboxDraftMessages)
    .slice(-promptDefinition.maxConversationMessages)
}

function buildConversationMessages(
  input: BuildInboxDraftRequestInput,
  sources: AiDraftSource[],
): AiDraftMessage[] {
  const promptDefinition = getInboxDraftPromptDefinition()

  return selectInboxDraftMessageWindow(input.messages)
    .flatMap((message) => {
      const text = sanitizeOptionalText(
        message.bodyText,
        promptDefinition.maxMessageCharacters,
      )
      if (!text) return []

      const sourceRef = `message:${message.id}`
      pushUniqueSource(sources, {
        kind: 'conversation',
        label: `Conversation message (${authorLabel(message.authorKind)})`,
        ref: sourceRef,
      })

      return [{
        id: message.id,
        author: message.authorKind,
        text,
        createdAt: message.createdAt,
        sourceRef,
      }]
    })
}

function buildConversationStateSection(
  input: BuildInboxDraftRequestInput,
  sources: AiDraftSource[],
): AiDraftContextSection {
  const sourceRef = `conversation:${input.conversation.id}:state`

  pushUniqueSource(sources, {
    kind: 'conversation',
    label: 'Conversation state',
    ref: sourceRef,
  })

  return {
    key: 'conversation_state',
    title: 'Conversation state',
    text: [
      `status=${input.conversation.status}`,
      `ownership_mode=${input.conversation.ownershipMode}`,
      `ai_paused=${input.conversation.aiPausedAt ? 'true' : 'false'}`,
      `known_customer=${input.conversation.clientId ? 'true' : 'false'}`,
    ].join('\n'),
    sourceRefs: [sourceRef],
  }
}

function buildTenantProfileSection(
  input: BuildInboxDraftRequestInput,
  sources: AiDraftSource[],
): AiDraftContextSection {
  const sourceRef = `tenant:${input.tenant.id}:profile`
  const lines = [
    `business_name=${sanitizeOptionalText(input.tenant.businessName, 120) ?? 'Styll tenant'}`,
    `timezone=${input.tenant.timezone}`,
  ]
  const tagline = sanitizeOptionalText(input.tenant.tagline, 140)
  const description = sanitizeOptionalText(input.tenant.description, 240)
  const preferredTone = sanitizeOptionalText(
    input.tenant.receptionistConfig.preferredTone,
    120,
  )
  const greetingStyle = sanitizeOptionalText(
    input.tenant.receptionistConfig.greetingStyle,
    120,
  )
  const escalationInstructions = sanitizeOptionalText(
    input.tenant.receptionistConfig.escalationInstructions,
    180,
  )

  if (tagline) lines.push(`tagline=${tagline}`)
  if (description) lines.push(`description=${description}`)
  if (preferredTone) lines.push(`preferred_tone=${preferredTone}`)
  if (greetingStyle) lines.push(`greeting_style=${greetingStyle}`)
  if (escalationInstructions) lines.push(`escalation_instructions=${escalationInstructions}`)

  pushUniqueSource(sources, {
    kind: 'knowledge',
    label: 'Tenant profile',
    ref: sourceRef,
  })

  return {
    key: 'tenant_profile',
    title: 'Tenant profile',
    text: lines.join('\n'),
    sourceRefs: [sourceRef],
  }
}

function buildServicesSection(
  input: BuildInboxDraftRequestInput,
  sources: AiDraftSource[],
): AiDraftContextSection | null {
  const promptDefinition = getInboxDraftPromptDefinition()
  const services = [...input.services]
    .sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder
      }
      if (left.name !== right.name) return left.name.localeCompare(right.name)
      return left.id.localeCompare(right.id)
    })
    .slice(0, promptDefinition.maxServices)

  if (services.length === 0) return null

  const lines: string[] = []
  const sourceRefs: string[] = []

  for (const service of services) {
    const sourceRef = `service:${service.id}`
    const description = sanitizeOptionalText(service.description, 140)
    const parts = [
      service.name,
      formatPrice(service.price),
      `${service.durationMinutes} min`,
    ]
    if (description) parts.push(description)

    pushUniqueSource(sources, {
      kind: 'knowledge',
      label: `Service: ${service.name}`,
      ref: sourceRef,
    })
    pushUniqueSourceRef(sourceRefs, sourceRef)
    lines.push(`- ${parts.join(' | ')}`)
  }

  return {
    key: 'services',
    title: 'Active services',
    text: lines.join('\n'),
    sourceRefs,
  }
}

function buildWorkingHoursSection(
  input: BuildInboxDraftRequestInput,
  sources: AiDraftSource[],
): AiDraftContextSection | null {
  const promptDefinition = getInboxDraftPromptDefinition()
  const rows = [...input.workingHours]
    .sort((left, right) => {
      if (left.dayOfWeek !== right.dayOfWeek) {
        return left.dayOfWeek - right.dayOfWeek
      }
      if (left.startTime !== right.startTime) {
        return left.startTime.localeCompare(right.startTime)
      }
      if (left.endTime !== right.endTime) {
        return left.endTime.localeCompare(right.endTime)
      }
      return left.id.localeCompare(right.id)
    })
    .slice(0, promptDefinition.maxWorkingHoursRows)

  if (rows.length === 0) return null

  const windowsByDay = new Map<number, string[]>()
  const sourceRefs: string[] = []

  for (const row of rows) {
    const sourceRef = `working_hours:${row.id}`
    const windows = windowsByDay.get(row.dayOfWeek) ?? []

    windows.push(`${row.startTime}-${row.endTime}`)
    windowsByDay.set(row.dayOfWeek, windows)
    pushUniqueSourceRef(sourceRefs, sourceRef)

    pushUniqueSource(sources, {
      kind: 'knowledge',
      label: `Working hours: ${DAY_NAMES[row.dayOfWeek] ?? `day_${row.dayOfWeek}`}`,
      ref: sourceRef,
    })
  }

  const lines = [...windowsByDay.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([dayOfWeek, windows]) => {
      const dayLabel = DAY_NAMES[dayOfWeek] ?? `day_${dayOfWeek}`
      return `- ${dayLabel}: ${windows.join(', ')}`
    })

  return {
    key: 'working_hours',
    title: 'Working hours',
    text: lines.join('\n'),
    sourceRefs,
  }
}

function buildToolPoliciesSection(
  sources: AiDraftSource[],
): AiDraftContextSection {
  const promptDefinition = getInboxDraftPromptDefinition()
  const allowedToolDefinitions = listInboxDraftAllowedToolDefinitions()
  const sourceRef = `policy:tool_registry:${promptDefinition.version}`

  pushUniqueSource(sources, {
    kind: 'policy',
    label: 'Inbox tool policy snapshot',
    ref: sourceRef,
  })

  return {
    key: 'tool_policies',
    title: 'Tool policies',
    text: allowedToolDefinitions
      .map((tool) => {
        const guard = tool.requiresCustomerConfirmation
          ? 'customer_confirmation'
          : tool.requiresStaffApproval
            ? 'staff_approval'
            : 'none'

        return `- ${tool.name} | policy=${tool.policy} | guard=${guard} | ${tool.description}`
      })
      .join('\n'),
    sourceRefs: [sourceRef],
  }
}

export function sanitizeDraftContextText(
  value: string | null | undefined,
  maxLength = getInboxDraftPromptDefinition().maxMessageCharacters,
): string | null {
  return sanitizeOptionalText(value, maxLength)
}

export function buildInboxDraftRequest(
  input: BuildInboxDraftRequestInput,
): PreparedInboxDraftRequest {
  if (input.conversation.id !== input.conversationId) {
    throw new InboxDraftPreparationError(
      'CONVERSATION_NOT_FOUND',
      'Conversation context does not match the requested conversation.',
      404,
    )
  }

  if (input.conversation.tenantId !== input.tenantId || input.tenant.id !== input.tenantId) {
    throw new InboxDraftPreparationError(
      'CROSS_TENANT_RESOURCE',
      'Draft context contains resources outside the active tenant scope.',
      404,
    )
  }

  const promptDefinition = getInboxDraftPromptDefinition()
  const sources: AiDraftSource[] = []
  const messages = buildConversationMessages(input, sources)
  const contextSections = [
    buildConversationStateSection(input, sources),
    buildTenantProfileSection(input, sources),
    buildServicesSection(input, sources),
    buildWorkingHoursSection(input, sources),
    buildToolPoliciesSection(sources),
  ].filter((section): section is AiDraftContextSection => section !== null)

  return {
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    promptId: promptDefinition.promptId,
    promptVersion: promptDefinition.version,
    systemPrompt: renderInboxDraftSystemPrompt(),
    messages,
    contextSections,
    sources,
    allowedTools: listInboxDraftAllowedTools(),
    conversationState: {
      status: input.conversation.status,
      ownershipMode: input.conversation.ownershipMode,
      aiPausedAt: input.conversation.aiPausedAt,
      clientId: input.conversation.clientId,
    },
    tenantProfile: {
      businessName: input.tenant.businessName,
      timezone: input.tenant.timezone,
    },
    receptionistConfig: input.tenant.receptionistConfig,
    serviceCatalog: input.services.map((service) => ({
      id: service.id,
      name: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
    })),
  }
}
