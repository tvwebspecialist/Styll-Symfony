import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveInboxReceptionistConfig } from '../../src/lib/ai/inbox-ai-config.ts'

test('resolveInboxReceptionistConfig falls back to a safe draft-only default', () => {
  const config = resolveInboxReceptionistConfig(null)

  assert.equal(config.mode, 'draft_only')
  assert.equal(config.autoReplyConfidenceThreshold, 0.9)
  assert.equal(config.handoffConfidenceThreshold, 0.65)
  assert.deepEqual(config.allowedAutonomousIntents, ['greeting', 'pricing', 'opening_hours'])
  assert.equal(config.preferredTone, null)
  assert.equal(config.greetingStyle, null)
  assert.equal(config.escalationInstructions, null)
})

test('resolveInboxReceptionistConfig keeps only valid tenant overrides and trims personalization text', () => {
  const config = resolveInboxReceptionistConfig({
    ai_receptionist: {
      mode: 'supervised',
      auto_reply_confidence_threshold: 0.82,
      handoff_confidence_threshold: 0.58,
      allowed_autonomous_intents: ['greeting', 'faq', 'not_real'],
      preferred_tone: '  caldo e rassicurante  ',
      greeting_style: ' saluto breve ',
      escalation_instructions: ' coinvolgi il titolare per reclami ',
    },
  })

  assert.equal(config.mode, 'supervised')
  assert.equal(config.autoReplyConfidenceThreshold, 0.82)
  assert.equal(config.handoffConfidenceThreshold, 0.58)
  assert.deepEqual(config.allowedAutonomousIntents, ['greeting', 'faq'])
  assert.equal(config.preferredTone, 'caldo e rassicurante')
  assert.equal(config.greetingStyle, 'saluto breve')
  assert.equal(config.escalationInstructions, 'coinvolgi il titolare per reclami')
})
