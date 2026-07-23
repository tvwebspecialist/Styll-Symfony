import type { InboxToolName } from '../messaging/contracts.ts'
import { listInboxToolDefinitions } from '../messaging/tool-registry.ts'
import {
  AI_DRAFT_INTENTS,
  type AiConversationUnderstanding,
  type AiDraftIntent,
  type AiDraftProvider,
  type AiDraftRequest,
  type AiDraftResponse,
} from './draft-provider.ts'

export const ANTHROPIC_INBOX_DRAFT_MODEL = 'claude-sonnet-5' as const

const DEFAULT_TIMEOUT_MS = 20_000
const MAX_OUTPUT_TOKENS = 500
const MAX_INTERNAL_REASONING_LENGTH = 640
const MAX_ENTITY_TEXT_LENGTH = 220
const INBOX_TOOL_NAMES = new Set<string>(
  listInboxToolDefinitions().map((tool) => tool.name),
)

const AI_DRAFT_INTENT_SET = new Set<string>(AI_DRAFT_INTENTS)

const anthropicDraftOutputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['draft', 'reasoning', 'understanding'],
  properties: {
    draft: {
      type: 'string',
      minLength: 1,
      maxLength: 4096,
    },
    reasoning: {
      anyOf: [
        {
          type: 'string',
          minLength: 1,
          maxLength: MAX_INTERNAL_REASONING_LENGTH,
        },
        {
          type: 'null',
        },
      ],
      default: null,
    },
    understanding: {
      type: 'object',
      additionalProperties: false,
      required: [
        'intent',
        'confidence',
        'handoff',
        'entities',
        'corrections',
        'citedSources',
        'requestedToolCalls',
      ],
      properties: {
        intent: {
          type: 'string',
          enum: [...AI_DRAFT_INTENTS],
        },
        confidence: {
          anyOf: [
            {
              type: 'number',
              minimum: 0,
              maximum: 1,
            },
            {
              type: 'null',
            },
          ],
          default: null,
        },
        handoff: {
          type: 'boolean',
        },
        entities: {
          type: 'object',
          additionalProperties: false,
          required: [
            'service',
            'requestedDate',
            'requestedTime',
            'appointmentReference',
            'customerName',
            'customerNotes',
          ],
          properties: {
            service: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: 120 },
                { type: 'null' },
              ],
              default: null,
            },
            requestedDate: {
              anyOf: [
                { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                { type: 'null' },
              ],
              default: null,
            },
            requestedTime: {
              anyOf: [
                { type: 'string', pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$' },
                { type: 'null' },
              ],
              default: null,
            },
            appointmentReference: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: 120 },
                { type: 'null' },
              ],
              default: null,
            },
            customerName: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: 80 },
                { type: 'null' },
              ],
              default: null,
            },
            customerNotes: {
              anyOf: [
                { type: 'string', minLength: 1, maxLength: MAX_ENTITY_TEXT_LENGTH },
                { type: 'null' },
              ],
              default: null,
            },
          },
        },
        corrections: {
          type: 'object',
          additionalProperties: false,
          required: ['replacesService', 'replacesDate', 'replacesTime'],
          properties: {
            replacesService: { type: 'boolean' },
            replacesDate: { type: 'boolean' },
            replacesTime: { type: 'boolean' },
          },
        },
        citedSources: {
          type: 'array',
          minItems: 1,
          maxItems: 16,
          items: {
            type: 'string',
            minLength: 1,
          },
        },
        requestedToolCalls: {
          type: 'array',
          maxItems: 6,
          default: [],
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['name', 'arguments'],
            properties: {
              name: {
                type: 'string',
                minLength: 1,
              },
              arguments: {
                type: 'object',
                additionalProperties: true,
                default: {},
              },
            },
          },
        },
      },
    },
  },
} as const

export interface AnthropicJsonSchemaFormat {
  type: 'json_schema'
  name: string
  schema: typeof anthropicDraftOutputSchema
  strict: boolean
}

export interface AnthropicMessageCreateParams {
  model: string
  max_tokens: number
  thinking: {
    type: 'disabled'
  }
  system: string
  messages: Array<{
    role: 'user'
    content: string
  }>
  output_config: {
    format: AnthropicJsonSchemaFormat
  }
}

interface AnthropicDraftOutput {
  draft: string
  reasoning: string | null
  understanding: AiConversationUnderstanding
}

interface ParsedAnthropicDraftMessage {
  id: string
  parsed_output: AnthropicDraftOutput | null
}

interface AnthropicDraftClient {
  messages: {
    parse(
      params: AnthropicMessageCreateParams,
      options?: {
        timeout?: number
      },
    ): Promise<ParsedAnthropicDraftMessage>
  }
}

export interface AnthropicDraftProviderOptions {
  apiKey: string | null | undefined
  client?: AnthropicDraftClient
  model?: string
  timeoutMs?: number
}

export class AnthropicDraftProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnthropicDraftProviderConfigurationError'
  }
}

export class AnthropicDraftProviderResponseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AnthropicDraftProviderResponseError'
  }
}

function sanitizeProviderModel(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function resolveTimeoutMs(timeoutMs?: number): number {
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return DEFAULT_TIMEOUT_MS
  }

  return Math.floor(timeoutMs)
}

function formatContextSection(input: AiDraftRequest): string {
  return input.contextSections
    .map((section) => [
      `## ${section.title} [${section.key}]`,
      `source_refs=${section.sourceRefs.join(', ') || 'none'}`,
      section.text,
    ].join('\n'))
    .join('\n\n')
}

function formatTranscript(input: AiDraftRequest): string {
  if (input.messages.length === 0) return '(no recent transcript available)'

  return input.messages
    .map((message) => {
      return [
        `- [${message.sourceRef}]`,
        `[${message.createdAt}]`,
        `${message.author}:`,
        message.text,
      ].join(' ')
    })
    .join('\n')
}

function formatSourceCatalog(input: AiDraftRequest): string {
  return input.sources
    .map((source) => `- ${source.ref} | ${source.kind} | ${source.label}`)
    .join('\n')
}

function buildAnthropicOutputFormat(): AnthropicJsonSchemaFormat {
  return {
    type: 'json_schema',
    name: 'inbox_draft_output',
    schema: anthropicDraftOutputSchema,
    strict: true,
  }
}

export function buildAnthropicDraftRequestPayload(
  input: AiDraftRequest,
  options?: {
    model?: string
  },
): AnthropicMessageCreateParams {
  const model = options?.model?.trim() || ANTHROPIC_INBOX_DRAFT_MODEL

  const content = [
    'Prepare one operator-reviewed WhatsApp receptionist draft.',
    'Today is 2026-07-20 and the tenant timezone is provided in context.',
    'Recent transcript:',
    formatTranscript(input),
    '',
    'Tenant-scoped context sections:',
    formatContextSection(input),
    '',
    'Traceable source catalog:',
    formatSourceCatalog(input),
    '',
    'Output rules:',
    '- Keep the draft concise, natural, and customer-facing.',
    '- Sound like a human receptionist, never like an AI assistant.',
    '- Use conversation_memory to keep continuity across short follow-ups.',
    '- Produce a nested understanding object that captures intent, entities, corrections, citedSources, and requestedToolCalls.',
    '- If a booking is incomplete, ask only one useful slot-filling question.',
    '- Never ask twice for information already present in conversation_memory.',
    '- If a booking already has service, date, and time, say that you are checking availability unless verified availability is explicitly present in context.',
    '- Never invent available slots, unavailable slots, calendars, staff schedules, or service durations.',
    '- Use only availability data returned by application code; if that data is not present, remain conservative.',
    '- Normalize requestedDate as YYYY-MM-DD when inferable from the latest customer message.',
    '- Normalize requestedTime as HH:MM in 24-hour format when inferable from the latest customer message.',
    '- Keep entity fields null when they are missing, ambiguous, or unsupported.',
    '- Mark replacesService, replacesDate, or replacesTime only when the latest customer message clearly corrects a previous value.',
    '- Never confirm a booking, a reschedule, or a cancellation as executed.',
    '- If information is missing, ask for the missing detail or say that staff must verify it.',
    '- Cite only source refs listed above and only if they support the draft.',
    '- requestedToolCalls remain advisory only and must never imply execution.',
    '- Set handoff=true when a human should review urgently or respond directly.',
    `- Allowed intents: ${AI_DRAFT_INTENTS.join(', ')}`,
  ].join('\n')

  const messages: AnthropicMessageCreateParams['messages'] = [
    {
      role: 'user',
      content,
    },
  ]

  return {
    model,
    max_tokens: MAX_OUTPUT_TOKENS,
    thinking: { type: 'disabled' },
    system: input.systemPrompt,
    messages,
    output_config: {
      format: buildAnthropicOutputFormat(),
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readTrimmedString(
  value: unknown,
  fieldName: string,
  options?: {
    maxLength?: number
    allowEmpty?: boolean
  },
): string {
  if (typeof value !== 'string') {
    throw new AnthropicDraftProviderResponseError(
      `Anthropic draft response field "${fieldName}" is invalid.`,
    )
  }

  const normalized = value.trim()
  if (!options?.allowEmpty && normalized.length === 0) {
    throw new AnthropicDraftProviderResponseError(
      `Anthropic draft response field "${fieldName}" is invalid.`,
    )
  }

  if (options?.maxLength && normalized.length > options.maxLength) {
    throw new AnthropicDraftProviderResponseError(
      `Anthropic draft response field "${fieldName}" is invalid.`,
    )
  }

  return normalized
}

function readNullableString(
  value: unknown,
  fieldName: string,
  options?: {
    maxLength?: number
  },
): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return readTrimmedString(value, fieldName, {
    maxLength: options?.maxLength,
  })
}

function readNullableConfidence(value: unknown, fieldName = 'confidence'): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new AnthropicDraftProviderResponseError(
      `Anthropic draft response field "${fieldName}" is invalid.`,
    )
  }

  return value
}

function readNullableReasoning(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return readTrimmedString(value, 'reasoning', {
    maxLength: MAX_INTERNAL_REASONING_LENGTH,
  })
}

function readRequestedTools(
  value: unknown,
): Array<{ name: string; arguments: Record<string, unknown> }> {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value) || value.length > 6) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response field "understanding.requestedToolCalls" is invalid.',
    )
  }

  return value.map((entry) => {
    if (!isRecord(entry)) {
      throw new AnthropicDraftProviderResponseError(
        'Anthropic draft response field "understanding.requestedToolCalls" is invalid.',
      )
    }

    const name = readTrimmedString(entry.name, 'understanding.requestedToolCalls.name')
    const argumentsValue = entry.arguments ?? {}
    if (!isRecord(argumentsValue)) {
      throw new AnthropicDraftProviderResponseError(
        'Anthropic draft response field "understanding.requestedToolCalls.arguments" is invalid.',
      )
    }

    return {
      name,
      arguments: argumentsValue,
    }
  })
}

function readCitedSources(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 16) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response did not include valid understanding.citedSources.',
    )
  }

  return value.map((entry) => readTrimmedString(entry, 'understanding.citedSources'))
}

function readIntent(value: unknown): AiDraftIntent {
  if (typeof value !== 'string' || !AI_DRAFT_INTENT_SET.has(value)) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response field "intent" is invalid.',
    )
  }

  return value as AiDraftIntent
}

function readUnderstanding(value: unknown): AiConversationUnderstanding {
  if (!isRecord(value)) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response did not include valid structured output.',
    )
  }

  if (typeof value.handoff !== 'boolean') {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response field "understanding.handoff" is invalid.',
    )
  }

  if (!isRecord(value.entities)) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response field "understanding.entities" is invalid.',
    )
  }

  if (!isRecord(value.corrections)) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response field "understanding.corrections" is invalid.',
    )
  }

  const corrections = value.corrections

  return {
    intent: readIntent(value.intent),
    confidence: readNullableConfidence(value.confidence, 'understanding.confidence'),
    handoff: value.handoff,
    entities: {
      service: readNullableString(value.entities.service, 'understanding.entities.service', {
        maxLength: 120,
      }),
      requestedDate: readNullableString(
        value.entities.requestedDate,
        'understanding.entities.requestedDate',
        { maxLength: 20 },
      ),
      requestedTime: readNullableString(
        value.entities.requestedTime,
        'understanding.entities.requestedTime',
        { maxLength: 20 },
      ),
      appointmentReference: readNullableString(
        value.entities.appointmentReference,
        'understanding.entities.appointmentReference',
        { maxLength: 120 },
      ),
      customerName: readNullableString(
        value.entities.customerName,
        'understanding.entities.customerName',
        { maxLength: 80 },
      ),
      customerNotes: readNullableString(
        value.entities.customerNotes,
        'understanding.entities.customerNotes',
        { maxLength: MAX_ENTITY_TEXT_LENGTH },
      ),
    },
    corrections: {
      replacesService:
        typeof corrections.replacesService === 'boolean'
          ? corrections.replacesService
          : (() => {
              throw new AnthropicDraftProviderResponseError(
                'Anthropic draft response field "understanding.corrections.replacesService" is invalid.',
              )
            })(),
      replacesDate:
        typeof corrections.replacesDate === 'boolean'
          ? corrections.replacesDate
          : (() => {
              throw new AnthropicDraftProviderResponseError(
                'Anthropic draft response field "understanding.corrections.replacesDate" is invalid.',
              )
            })(),
      replacesTime:
        typeof corrections.replacesTime === 'boolean'
          ? corrections.replacesTime
          : (() => {
              throw new AnthropicDraftProviderResponseError(
                'Anthropic draft response field "understanding.corrections.replacesTime" is invalid.',
              )
            })(),
    },
    citedSources: readCitedSources(value.citedSources),
    requestedToolCalls: readRequestedTools(value.requestedToolCalls),
  }
}

function parseAnthropicDraftOutput(output: unknown): AnthropicDraftOutput {
  if (!isRecord(output)) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response did not include valid structured output.',
    )
  }

  return {
    draft: readTrimmedString(output.draft, 'draft', { maxLength: 4096 }),
    reasoning: readNullableReasoning(output.reasoning),
    understanding: readUnderstanding(output.understanding),
  }
}

function normalizeAnthropicDraftOutput(output: unknown): AiDraftResponse {
  const parsedOutput = parseAnthropicDraftOutput(output)
  const citedSources = [...new Set(parsedOutput.understanding.citedSources.map((ref) => ref.trim()).filter(Boolean))]

  if (citedSources.length === 0) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response did not include valid understanding.citedSources.',
    )
  }

  const requestedToolCalls = parsedOutput.understanding.requestedToolCalls
    .filter((toolCall): toolCall is {
      name: InboxToolName
      arguments: Record<string, unknown>
    } => INBOX_TOOL_NAMES.has(toolCall.name))
    .map((toolCall) => ({
      name: toolCall.name,
      arguments: toolCall.arguments,
    }))

  return {
    draftText: parsedOutput.draft,
    confidence: parsedOutput.understanding.confidence,
    intent: parsedOutput.understanding.intent,
    handoff: parsedOutput.understanding.handoff,
    understanding: {
      ...parsedOutput.understanding,
      citedSources,
      requestedToolCalls,
    },
    internalReasoning: parsedOutput.reasoning,
    citedSources,
    requestedToolCalls,
    providerRunId: null,
  }
}

async function createAnthropicSdkClient(input: {
  apiKey: string
  timeoutMs: number
}): Promise<AnthropicDraftClient> {
  const sdkModule = await import('@anthropic-ai/sdk')

  return new sdkModule.default({
    apiKey: input.apiKey,
    timeout: input.timeoutMs,
  }) as AnthropicDraftClient
}

export function createAnthropicDraftProvider(
  options: AnthropicDraftProviderOptions,
): AiDraftProvider {
  const apiKey = options.apiKey?.trim()
  if (!apiKey) {
    throw new AnthropicDraftProviderConfigurationError(
      'ANTHROPIC_API_KEY is required when the inbox draft provider is set to anthropic.',
    )
  }

  const timeoutMs = resolveTimeoutMs(options.timeoutMs)
  const model = options.model?.trim() || ANTHROPIC_INBOX_DRAFT_MODEL
  let clientPromise: Promise<AnthropicDraftClient> | null = null

  return {
    providerId: `anthropic_${sanitizeProviderModel(model)}_draft_v1`,
    async generateDraft(input: AiDraftRequest): Promise<AiDraftResponse> {
      const payload = buildAnthropicDraftRequestPayload(input, { model })
      const client = options.client
        ?? await (clientPromise ??= createAnthropicSdkClient({
          apiKey,
          timeoutMs,
        }))

      let message: ParsedAnthropicDraftMessage
      try {
        message = await client.messages.parse(payload, { timeout: timeoutMs })
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        if (/timed?\s*out|timeout/i.test(reason)) {
          throw new Error(`Anthropic draft request timed out after ${timeoutMs}ms.`)
        }

        throw new Error(`Anthropic draft request failed: ${reason}`)
      }

      if (!message.parsed_output) {
        throw new AnthropicDraftProviderResponseError(
          'Anthropic draft response did not include parsed structured output.',
        )
      }

      const normalized = normalizeAnthropicDraftOutput(message.parsed_output)

      return {
        ...normalized,
        providerRunId: message.id,
      }
    },
  }
}
