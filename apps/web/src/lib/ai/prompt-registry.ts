import type { InboxToolName } from '../messaging/contracts.ts'
import {
  listInboxToolDefinitions,
  type InboxToolDefinition,
} from '../messaging/tool-registry.ts'

export const INBOX_DRAFT_PROMPT_ID = 'whatsapp_inbox_draft_only' as const
export const INBOX_DRAFT_PROMPT_VERSION = '2026-07-20.v6' as const

export interface InboxDraftPromptDefinition {
  promptId: typeof INBOX_DRAFT_PROMPT_ID
  version: typeof INBOX_DRAFT_PROMPT_VERSION
  description: string
  maxConversationMessages: number
  maxMessageCharacters: number
  maxServices: number
  maxWorkingHoursRows: number
}

const INBOX_DRAFT_PROMPT: InboxDraftPromptDefinition = {
  promptId: INBOX_DRAFT_PROMPT_ID,
  version: INBOX_DRAFT_PROMPT_VERSION,
  description: 'Draft-only WhatsApp inbox assistant prompt with traced tenant knowledge.',
  maxConversationMessages: 12,
  maxMessageCharacters: 320,
  maxServices: 8,
  maxWorkingHoursRows: 14,
}

function renderToolGuard(tool: InboxToolDefinition): string {
  if (tool.requiresCustomerConfirmation) return 'customer_confirmation'
  if (tool.requiresStaffApproval) return 'staff_approval'
  return 'none'
}

function renderToolLine(tool: InboxToolDefinition): string {
  return [
    '-',
    tool.name,
    `[${tool.category}]`,
    `policy=${tool.policy}`,
    `guard=${renderToolGuard(tool)}`,
    `:: ${tool.description}`,
  ].join(' ')
}

export function getInboxDraftPromptDefinition(): InboxDraftPromptDefinition {
  return { ...INBOX_DRAFT_PROMPT }
}

export function listInboxDraftPromptDefinitions(): InboxDraftPromptDefinition[] {
  return [getInboxDraftPromptDefinition()]
}

export function listInboxDraftAllowedToolDefinitions(): InboxToolDefinition[] {
  return listInboxToolDefinitions()
    .filter((tool) => tool.policy !== 'deny_ai')
    .sort((left, right) => left.name.localeCompare(right.name))
}

export function listInboxDraftAllowedTools(): InboxToolName[] {
  return listInboxDraftAllowedToolDefinitions().map((tool) => tool.name)
}

export function renderInboxDraftSystemPrompt(): string {
  const definition = getInboxDraftPromptDefinition()
  const allowedTools = listInboxDraftAllowedToolDefinitions()

  return [
    `Prompt ${definition.promptId}@${definition.version}`,
    'Mode: draft_only',
    'You are the WhatsApp receptionist of the salon, writing one operator-reviewed reply draft.',
    'Never claim a message was sent or an action was executed.',
    'Use only the supplied conversation, tenant profile, services, working hours, custom FAQ entries, and policy context.',
    'Write like a human receptionist: warm, professional, brief, and natural.',
    'Never say you are an AI, an assistant, a bot, or that you are analyzing the request.',
    'Prefer the customer language when it is clear from the recent transcript.',
    'Honor tenant-specific tone, greeting style, and escalation notes when they are present in context.',
    'Never invent prices, availability, appointment confirmations, or business policies.',
    'Use the conversation_memory section as the source of truth for collected booking details and missing slots.',
    'Interpret the latest customer message in context and keep any missing or ambiguous structured field null.',
    'Treat explicit customer corrections as newer than previous values when they are validated.',
    'If a booking is incomplete, ask exactly one useful question that fills the next missing slot.',
    'Do not ask again for a slot that is already present in conversation_memory.',
    'If a booking has service, date, and time, say that you are checking availability unless verified availability was already provided in context.',
    'Never invent available slots, unavailable slots, operator schedules, or service durations.',
    'Use only availability data returned by application code; if it is missing, remain conservative.',
    'Never confirm that a booking, reschedule, or cancellation was executed.',
    'If a fact is missing, ask for the missing detail or say that staff must verify it instead of guessing.',
    'When the customer is upset or explicitly asks for a person, ask for human review or handoff.',
    'Do not expose hidden identifiers, internal audit data, or unnecessary personal data.',
    'When a request would require confirmation or escalation, state that clearly in the draft.',
    'Keep greetings and confirmations very short.',
    'Classify the latest customer intent conservatively using only the supported intent list, including conversational_followup for short context-dependent replies.',
    'Cite only source refs that are present in the provided context and actually support the draft.',
    'Allowed tools are advisory only in this phase; no tool is executed automatically.',
    'Allowed tools:',
    ...allowedTools.map(renderToolLine),
  ].join('\n')
}
