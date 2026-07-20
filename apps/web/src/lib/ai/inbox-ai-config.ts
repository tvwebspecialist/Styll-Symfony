import {
  AI_DRAFT_INTENTS,
  INBOX_AI_RECEPTIONIST_MODES,
  type AiDraftIntent,
  type InboxAiReceptionistConfig,
} from './draft-provider.ts'

const DEFAULT_AUTO_REPLY_CONFIDENCE_THRESHOLD = 0.9
const DEFAULT_HANDOFF_CONFIDENCE_THRESHOLD = 0.65
const DEFAULT_ALLOWED_AUTONOMOUS_INTENTS: AiDraftIntent[] = [
  'greeting',
  'pricing',
  'opening_hours',
]
const MAX_CONFIGURATION_TEXT_LENGTH = 280

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (normalized.length === 0) return null
  return normalized.slice(0, MAX_CONFIGURATION_TEXT_LENGTH)
}

function readThreshold(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  if (value < 0 || value > 1) {
    return fallback
  }

  return Math.round(value * 1000) / 1000
}

function readAutonomousIntents(value: unknown): AiDraftIntent[] {
  if (!Array.isArray(value)) {
    return [...DEFAULT_ALLOWED_AUTONOMOUS_INTENTS]
  }

  const validIntents = new Set(AI_DRAFT_INTENTS)
  const normalized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry): entry is AiDraftIntent => validIntents.has(entry as AiDraftIntent))

  return normalized.length > 0
    ? [...new Set(normalized)]
    : [...DEFAULT_ALLOWED_AUTONOMOUS_INTENTS]
}

export function resolveInboxReceptionistConfig(
  settings: unknown,
): InboxAiReceptionistConfig {
  const root = isRecord(settings) ? settings : {}
  const rawConfig = isRecord(root.ai_receptionist) ? root.ai_receptionist : {}
  const rawMode = rawConfig.mode
  const mode = INBOX_AI_RECEPTIONIST_MODES.includes(rawMode as InboxAiReceptionistConfig['mode'])
    ? rawMode as InboxAiReceptionistConfig['mode']
    : 'draft_only'

  return {
    mode,
    autoReplyConfidenceThreshold: readThreshold(
      rawConfig.auto_reply_confidence_threshold,
      DEFAULT_AUTO_REPLY_CONFIDENCE_THRESHOLD,
    ),
    handoffConfidenceThreshold: readThreshold(
      rawConfig.handoff_confidence_threshold,
      DEFAULT_HANDOFF_CONFIDENCE_THRESHOLD,
    ),
    allowedAutonomousIntents: readAutonomousIntents(rawConfig.allowed_autonomous_intents),
    preferredTone: readOptionalText(rawConfig.preferred_tone),
    greetingStyle: readOptionalText(rawConfig.greeting_style),
    escalationInstructions: readOptionalText(rawConfig.escalation_instructions),
  }
}
