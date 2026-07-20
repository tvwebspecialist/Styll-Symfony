import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getInboxDraftPromptDefinition,
  listInboxDraftAllowedTools,
  listInboxDraftPromptDefinitions,
  renderInboxDraftSystemPrompt,
} from '../../src/lib/ai/prompt-registry.ts'
import { listInboxToolDefinitions } from '../../src/lib/messaging/tool-registry.ts'
import { getToolPolicy } from '../../src/lib/messaging/policy.ts'

test('prompt registry exposes a single versioned draft-only prompt', () => {
  const definitions = listInboxDraftPromptDefinitions()

  assert.equal(definitions.length, 1)
  assert.deepEqual(definitions[0], getInboxDraftPromptDefinition())
  assert.equal(definitions[0].promptId, 'whatsapp_inbox_draft_only')
  assert.equal(definitions[0].version, '2026-07-20.v3')
})

test('prompt registry keeps deny_ai tools out of the draft context', () => {
  const allowedTools = listInboxDraftAllowedTools()
  const expectedTools = listInboxToolDefinitions()
    .filter((tool) => getToolPolicy(tool.name) !== 'deny_ai')
    .map((tool) => tool.name)
    .sort()

  assert.deepEqual([...allowedTools].sort(), expectedTools)
})

test('prompt registry renders deterministic draft-only instructions', () => {
  const prompt = renderInboxDraftSystemPrompt()

  assert.match(prompt, /draft_only/)
  assert.match(prompt, /Never claim a message was sent/)
  assert.match(prompt, /Honor tenant-specific tone, greeting style, and escalation notes/)
  assert.match(prompt, /Never invent prices, availability, appointment confirmations/)
  assert.match(prompt, /Classify the latest customer intent conservatively/)
  assert.match(prompt, /confirm_appointment/)
  assert.doesNotMatch(prompt, /refund/)
})
