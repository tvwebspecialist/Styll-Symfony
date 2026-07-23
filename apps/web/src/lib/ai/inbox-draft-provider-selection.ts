import type { AiDraftProvider, AiDraftRequest } from './draft-provider.ts'
import { deterministicFakeDraftProvider } from './deterministic-fake-draft-provider.ts'

type InboxDraftProviderMode = 'fake' | 'anthropic'
const ANTHROPIC_INBOX_DRAFT_MODEL = 'claude-sonnet-5' as const

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
    const apiKey = env.ANTHROPIC_API_KEY?.trim()
    if (!apiKey) {
      throw new InboxDraftProviderSelectionError(
        'ANTHROPIC_API_KEY is required when the inbox draft provider is set to anthropic.',
      )
    }

    let providerPromise: Promise<AiDraftProvider> | null = null
    const providerId = resolveConfiguredInboxDraftProviderId(env)

    return {
      providerId,
      async generateDraft(input: AiDraftRequest) {
        providerPromise ??= import('./anthropic-draft-provider.ts').then(
          ({ createAnthropicDraftProvider }) =>
            createAnthropicDraftProvider({
              apiKey,
            }),
        )

        const provider = await providerPromise
        return provider.generateDraft(input)
      },
    }
  }

  return deterministicFakeDraftProvider
}

export function resolveConfiguredInboxDraftProviderId(
  env: Record<string, string | undefined> = process.env,
): string {
  const mode = normalizeInboxDraftProviderMode(env.INBOX_AI_PROVIDER)

  if (mode === 'anthropic') {
    return `anthropic_${ANTHROPIC_INBOX_DRAFT_MODEL.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_draft_v1`
  }

  return deterministicFakeDraftProvider.providerId
}

export function resolveInboxDraftProviderLabel(providerId: string): string {
  if (providerId.startsWith('anthropic_')) {
    return 'Claude Sonnet'
  }

  return 'AI bozza locale'
}
