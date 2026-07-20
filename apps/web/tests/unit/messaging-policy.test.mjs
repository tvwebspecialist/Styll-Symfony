import test from 'node:test'
import assert from 'node:assert/strict'

import { buildConversationKey, buildTenantResolutionKey, isInboundCustomerMessage } from '../../src/lib/messaging/provider-adapter.ts'
import {
  containsSensitiveData,
  decideAiDispatch,
  getHumanHandoffReason,
  getToolPolicy,
} from '../../src/lib/messaging/policy.ts'

test('buildConversationKey and buildTenantResolutionKey are stable and deterministic', () => {
  assert.equal(
    buildConversationKey('meta_whatsapp', '123456', '39333111222'),
    'meta_whatsapp:123456:39333111222'
  )
  assert.equal(
    buildTenantResolutionKey({ provider: 'meta_whatsapp', phoneNumberId: '123456' }),
    'meta_whatsapp:123456'
  )
})

test('isInboundCustomerMessage only matches inbound customer payloads', () => {
  assert.equal(isInboundCustomerMessage({ direction: 'inbound', authorKind: 'customer' }), true)
  assert.equal(isInboundCustomerMessage({ direction: 'outbound', authorKind: 'customer' }), false)
  assert.equal(isInboundCustomerMessage({ direction: 'inbound', authorKind: 'assistant' }), false)
})

test('tool policy follows the conservative matrix for mutating actions', () => {
  assert.equal(getToolPolicy('get_business_info'), 'allow')
  assert.equal(getToolPolicy('confirm_appointment'), 'ask_customer')
  assert.equal(getToolPolicy('apply_discount'), 'ask_owner')
  assert.equal(getToolPolicy('refund'), 'deny_ai')
})

test('human handoff is triggered by human request, sensitive data or repeated failures', () => {
  assert.equal(getHumanHandoffReason({ text: 'Vorrei parlare con una persona' }), 'human_requested')
  assert.equal(containsSensitiveData('Ti mando il mio iban per il rimborso'), true)
  assert.equal(getHumanHandoffReason({ text: 'Ti mando il mio iban per il rimborso' }), 'sensitive_data')
  assert.equal(
    getHumanHandoffReason({ text: 'non hai capito', misunderstandingCount: 2 }),
    'repeated_misunderstanding'
  )
})

test('AI dispatch avoids cost when a deterministic route is enough or budget is exhausted', () => {
  assert.deepEqual(
    decideAiDispatch({
      aiEnabled: true,
      aiPaused: false,
      humanAssigned: false,
      serviceWindowOpen: true,
      deterministicIntentMatched: true,
      requiresMutation: false,
      estimatedRunCostCents: 1,
      remainingBudgetCents: 20,
    }),
    { shouldRun: false, reason: 'deterministic_route' }
  )

  assert.deepEqual(
    decideAiDispatch({
      aiEnabled: true,
      aiPaused: false,
      humanAssigned: false,
      serviceWindowOpen: true,
      deterministicIntentMatched: false,
      requiresMutation: true,
      estimatedRunCostCents: 10,
      remainingBudgetCents: 5,
    }),
    { shouldRun: false, reason: 'insufficient_budget' }
  )

  assert.deepEqual(
    decideAiDispatch({
      aiEnabled: true,
      aiPaused: false,
      humanAssigned: false,
      serviceWindowOpen: true,
      deterministicIntentMatched: false,
      requiresMutation: false,
      estimatedRunCostCents: 2,
      remainingBudgetCents: 20,
    }),
    { shouldRun: true, reason: 'run' }
  )
})
