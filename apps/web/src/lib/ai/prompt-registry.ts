import type { InboxToolName } from '../messaging/contracts.ts'
import {
  listInboxToolDefinitions,
  type InboxToolDefinition,
} from '../messaging/tool-registry.ts'

export const INBOX_DRAFT_PROMPT_ID = 'whatsapp_inbox_draft_only' as const
export const INBOX_DRAFT_PROMPT_VERSION = '2026-07-20.v3' as const

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
  maxConversationMessages: 8,
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
    'You prepare a WhatsApp receptionist reply draft for a human operator review.',
    'Never claim a message was sent or an action was executed.',
    'Use only the supplied conversation, tenant profile, services, working hours, and policy context.',
    'Write concise, natural WhatsApp text with a polite and calm tone.',
    'Prefer the customer language when it is clear from the recent transcript.',
    'Honor tenant-specific tone, greeting style, and escalation notes when they are present in context.',
    'Never invent prices, availability, appointment confirmations, or business policies.',
    'If a fact is missing, say that it must be verified by staff instead of guessing.',
    'When the context is insufficient or the customer is upset, ask for human review or handoff.',
    'Do not expose hidden identifiers, internal audit data, or unnecessary personal data.',
    'When a request would require confirmation or escalation, state that clearly in the draft.',
    'Classify the latest customer intent conservatively using only the supported intent list.',
    'Cite only source refs that are present in the provided context and actually support the draft.',
    'Allowed tools are advisory only in this phase; no tool is executed automatically.',
    'Allowed tools:',
    ...allowedTools.map(renderToolLine),
  ].join('\n')
}
