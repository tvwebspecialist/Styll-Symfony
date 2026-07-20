import test from 'node:test'
import assert from 'node:assert/strict'

import {
  InboxDraftProviderSelectionError,
  resolveConfiguredInboxDraftProvider,
} from '../../src/lib/ai/inbox-draft-provider-selection.ts'

test('resolveConfiguredInboxDraftProvider falls back to the deterministic fake provider for unknown modes', () => {
  const provider = resolveConfiguredInboxDraftProvider({
    INBOX_AI_PROVIDER: 'unexpected-value',
  })

  assert.equal(provider.providerId, 'deterministic_fake_draft_v1')
})

test('resolveConfiguredInboxDraftProvider keeps the fake provider as the safe default', () => {
  const provider = resolveConfiguredInboxDraftProvider({})

  assert.equal(provider.providerId, 'deterministic_fake_draft_v1')
})

test('resolveConfiguredInboxDraftProvider selects Anthropic without changing callers when configured', () => {
  const provider = resolveConfiguredInboxDraftProvider({
    INBOX_AI_PROVIDER: 'anthropic',
    ANTHROPIC_API_KEY: 'test-key',
  })

  assert.match(provider.providerId, /^anthropic_/)
})

test('resolveConfiguredInboxDraftProvider fails closed when Anthropic is selected without an API key', () => {
  assert.throws(
    () =>
      resolveConfiguredInboxDraftProvider({
        INBOX_AI_PROVIDER: 'anthropic',
        ANTHROPIC_API_KEY: '   ',
      }),
    InboxDraftProviderSelectionError,
  )
})
