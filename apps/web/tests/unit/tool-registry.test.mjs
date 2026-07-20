import test from 'node:test'
import assert from 'node:assert/strict'

import { getToolPolicy } from '../../src/lib/messaging/policy.ts'
import {
  getInboxToolDefinition,
  listInboxToolDefinitions,
  listInboxToolsByPolicy,
} from '../../src/lib/messaging/tool-registry.ts'

test('tool registry exposes every inbox tool with stable policy metadata', () => {
  const definitions = listInboxToolDefinitions()
  const names = definitions.map((tool) => tool.name)

  assert.equal(new Set(names).size, names.length)
  assert.ok(names.includes('confirm_appointment'))
  assert.ok(names.includes('bulk_campaign'))

  for (const definition of definitions) {
    assert.equal(definition.policy, getToolPolicy(definition.name))
  }
})

test('tool registry marks confirm flows as customer-confirmed and internal notes as staff-only', () => {
  const confirmAppointment = getInboxToolDefinition('confirm_appointment')
  assert.equal(confirmAppointment.category, 'confirm_mutation')
  assert.equal(confirmAppointment.requiresCustomerConfirmation, true)
  assert.equal(confirmAppointment.requiresStaffApproval, false)

  const internalNote = getInboxToolDefinition('add_internal_note')
  assert.equal(internalNote.category, 'staff_only')
  assert.equal(internalNote.requiresCustomerConfirmation, false)
  assert.equal(internalNote.requiresStaffApproval, true)
})

test('tool registry can list only AI-allowed tools without restricted actions', () => {
  const allowedTools = listInboxToolsByPolicy('allow')
  assert.ok(allowedTools.length > 0)
  assert.ok(allowedTools.every((tool) => tool.policy === 'allow'))
  assert.ok(allowedTools.every((tool) => tool.name !== 'refund'))
})
