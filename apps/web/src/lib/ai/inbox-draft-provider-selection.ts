import {
  AnthropicDraftProviderConfigurationError,
  createAnthropicDraftProvider,
} from './anthropic-draft-provider.ts'
import { deterministicFakeDraftProvider } from './deterministic-fake-draft-provider.ts'

type InboxDraftProviderMode = 'fake' | 'anthropic'

export class InboxDraftProviderSelectionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InboxDraftProviderSelectionError'
  }
}

function normalizeInboxDraftProviderMode(
  value: string | undefined,
): InboxDraftProviderMode {
  switch (value?.trim().toLowerCase()) {
    case 'anthropic':
      return 'anthropic'
    case 'fake':
    case undefined:
    case '':
      return 'fake'
    default:
      return 'fake'
  }
}

export function resolveConfiguredInboxDraftProvider(
  env: Record<string, string | undefined> = process.env,
) {
  const mode = normalizeInboxDraftProviderMode(env.INBOX_AI_PROVIDER)

  if (mode === 'anthropic') {
    try {
      return createAnthropicDraftProvider({
        apiKey: env.ANTHROPIC_API_KEY,
      })
    } catch (error) {
      if (error instanceof AnthropicDraftProviderConfigurationError) {
        throw new InboxDraftProviderSelectionError(error.message)
      }

      throw error
    }
  }

  return deterministicFakeDraftProvider
}

export function resolveInboxDraftProviderLabel(providerId: string): string {
  if (providerId.startsWith('anthropic_')) {
    return 'Claude Sonnet'
  }

  return 'AI bozza locale'
}
