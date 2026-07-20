import Anthropic, {
  type ParseableMessageCreateParams,
} from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'

import type { InboxToolName } from '../messaging/contracts.ts'
import { listInboxToolDefinitions } from '../messaging/tool-registry.ts'
import {
  AI_DRAFT_INTENTS,
  type AiDraftProvider,
  type AiDraftRequest,
  type AiDraftResponse,
} from './draft-provider.ts'

export const ANTHROPIC_INBOX_DRAFT_MODEL = 'claude-sonnet-5' as const

const DEFAULT_TIMEOUT_MS = 20_000
const MAX_OUTPUT_TOKENS = 500
const MAX_INTERNAL_REASONING_LENGTH = 640
const INBOX_TOOL_NAMES = new Set<string>(
  listInboxToolDefinitions().map((tool) => tool.name),
)

const anthropicDraftOutputSchema = z.object({
  draft: z.string().trim().min(1).max(4096),
  confidence: z.number().min(0).max(1).nullable().default(null),
  reasoning: z
    .string()
    .trim()
    .min(1)
    .max(MAX_INTERNAL_REASONING_LENGTH)
    .nullable()
    .default(null),
  requested_tools: z.array(z.object({
    name: z.string().trim().min(1),
    arguments: z.record(z.string(), z.unknown()).default({}),
  })).max(6).default([]),
  cited_sources: z.array(z.string().trim().min(1)).min(1).max(16),
  handoff: z.boolean(),
  intent: z.enum(AI_DRAFT_INTENTS),
})

type AnthropicDraftOutput = z.infer<typeof anthropicDraftOutputSchema>

interface ParsedAnthropicDraftMessage {
  id: string
  parsed_output: AnthropicDraftOutput | null
}

interface AnthropicDraftClient {
  messages: {
    parse(
      params: ParseableMessageCreateParams,
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

export function buildAnthropicDraftRequestPayload(
  input: AiDraftRequest,
  options?: {
    model?: string
  },
): ParseableMessageCreateParams {
  const model = options?.model?.trim() || ANTHROPIC_INBOX_DRAFT_MODEL

  const content = [
    'Prepare one operator-reviewed WhatsApp receptionist draft.',
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
    '- If information is missing, say that staff must verify it.',
    '- Cite only source refs listed above and only if they support the draft.',
    '- requested_tools remain advisory only and must never imply execution.',
    '- Set handoff=true when a human should review urgently or respond directly.',
    `- Allowed intents: ${AI_DRAFT_INTENTS.join(', ')}`,
  ].join('\n')

  const messages: ParseableMessageCreateParams['messages'] = [
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
      format: zodOutputFormat(anthropicDraftOutputSchema),
    },
  }
}

function normalizeAnthropicDraftOutput(output: AnthropicDraftOutput): AiDraftResponse {
  const citedSources = [...new Set(output.cited_sources.map((ref) => ref.trim()).filter(Boolean))]

  if (citedSources.length === 0) {
    throw new AnthropicDraftProviderResponseError(
      'Anthropic draft response did not include valid cited sources.',
    )
  }

  const requestedToolCalls = output.requested_tools
    .filter((toolCall): toolCall is {
      name: InboxToolName
      arguments: Record<string, unknown>
    } => INBOX_TOOL_NAMES.has(toolCall.name))
    .map((toolCall) => ({
      name: toolCall.name,
      arguments: toolCall.arguments,
    }))

  return {
    draftText: output.draft.trim(),
    confidence: output.confidence,
    intent: output.intent,
    handoff: output.handoff,
    internalReasoning: output.reasoning?.trim() || null,
    citedSources,
    requestedToolCalls,
    providerRunId: null,
  }
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
  const client =
    options.client
    ?? new Anthropic({
      apiKey,
      timeout: timeoutMs,
    })

  return {
    providerId: `anthropic_${sanitizeProviderModel(model)}_draft_v1`,
    async generateDraft(input: AiDraftRequest): Promise<AiDraftResponse> {
      const payload = buildAnthropicDraftRequestPayload(input, { model })

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
