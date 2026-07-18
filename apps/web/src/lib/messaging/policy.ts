import type {
  InboxConversationStatus,
  InboxToolName,
  ToolPolicyDecision,
} from './contracts'

const HUMAN_REQUEST_KEYWORDS = [
  'persona',
  'operatore',
  'barbiere',
  'umano',
  'richiamami',
  'richiamatemi',
  'parlare con qualcuno',
]

const SENSITIVE_DATA_PATTERNS = [
  /\biban\b/i,
  /\bcarta\b/i,
  /\bcredit card\b/i,
  /\bcvv\b/i,
  /\bpin\b/i,
  /\bcodice fiscale\b/i,
  /\bdocumento\b/i,
]

const TOOL_POLICY: Record<InboxToolName, ToolPolicyDecision> = {
  get_business_info: 'allow',
  get_services: 'allow',
  get_prices: 'allow',
  get_working_hours: 'allow',
  search_availability: 'allow',
  prepare_appointment: 'allow',
  confirm_appointment: 'ask_customer',
  prepare_reschedule: 'allow',
  confirm_reschedule: 'ask_customer',
  prepare_cancellation: 'allow',
  confirm_cancellation: 'ask_customer',
  get_loyalty_summary: 'allow',
  request_human_handoff: 'allow',
  add_internal_note: 'ask_staff',
  apply_discount: 'ask_owner',
  waive_penalty: 'ask_owner',
  refund: 'deny_ai',
  delete_customer: 'deny_ai',
  change_role: 'deny_ai',
  bulk_campaign: 'deny_ai',
}

export interface HumanHandoffInput {
  text: string
  messageEchoFromHuman?: boolean
  misunderstandingCount?: number
  repeatedToolFailures?: number
  status?: InboxConversationStatus
}

export interface AiDispatchInput {
  aiEnabled: boolean
  aiPaused: boolean
  humanAssigned: boolean
  serviceWindowOpen: boolean
  deterministicIntentMatched: boolean
  requiresMutation: boolean
  estimatedRunCostCents: number
  remainingBudgetCents: number
}

export interface AiDispatchDecision {
  shouldRun: boolean
  reason:
    | 'disabled'
    | 'ai_paused'
    | 'human_owned'
    | 'outside_service_window'
    | 'deterministic_route'
    | 'insufficient_budget'
    | 'run'
}

export function getToolPolicy(toolName: InboxToolName): ToolPolicyDecision {
  return TOOL_POLICY[toolName]
}

export function containsSensitiveData(text: string): boolean {
  return SENSITIVE_DATA_PATTERNS.some((pattern) => pattern.test(text))
}

export function getHumanHandoffReason(input: HumanHandoffInput): string | null {
  const lowered = input.text.toLowerCase()

  if (input.messageEchoFromHuman) return 'human_message_echo'
  if (HUMAN_REQUEST_KEYWORDS.some((keyword) => lowered.includes(keyword))) return 'human_requested'
  if (containsSensitiveData(input.text)) return 'sensitive_data'
  if ((input.misunderstandingCount ?? 0) >= 2) return 'repeated_misunderstanding'
  if ((input.repeatedToolFailures ?? 0) >= 2) return 'repeated_tool_failure'
  if (input.status === 'waiting_staff_approval' || input.status === 'human_requested') {
    return 'staff_approval_required'
  }

  return null
}

export function decideAiDispatch(input: AiDispatchInput): AiDispatchDecision {
  if (!input.aiEnabled) return { shouldRun: false, reason: 'disabled' }
  if (input.aiPaused) return { shouldRun: false, reason: 'ai_paused' }
  if (input.humanAssigned) return { shouldRun: false, reason: 'human_owned' }
  if (!input.serviceWindowOpen && !input.requiresMutation) {
    return { shouldRun: false, reason: 'outside_service_window' }
  }
  if (input.deterministicIntentMatched && !input.requiresMutation) {
    return { shouldRun: false, reason: 'deterministic_route' }
  }
  if (input.remainingBudgetCents < input.estimatedRunCostCents) {
    return { shouldRun: false, reason: 'insufficient_budget' }
  }

  return { shouldRun: true, reason: 'run' }
}
