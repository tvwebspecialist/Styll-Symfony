import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ConversationStateError,
  transitionConversationState,
  updateConversationStateCore,
} from '../../src/lib/messaging/conversation-state-core.ts'

const CONVERSATION_ID = '22222222-2222-4222-8222-222222222222'

function makeConversation(overrides = {}) {
  return {
    conversationId: CONVERSATION_ID,
    tenantId: 'tenant-a',
    status: 'new',
    ownershipMode: 'hybrid',
    assignedStaffId: null,
    aiPausedAt: null,
    ...overrides,
  }
}

function makeActor(overrides = {}) {
  return {
    tenantId: 'tenant-a',
    userId: 'user-1',
    staffId: 'staff-1',
    role: 'receptionist',
    displayName: 'Sara',
    ...overrides,
  }
}

function makeDeps(overrides = {}) {
  const calls = {
    applyTransition: 0,
  }

  const deps = {
    async getAuthenticatedUserId() {
      return 'user-1'
    },
    async getRequestTenantId() {
      return 'tenant-a'
    },
    async getConversation() {
      return makeConversation()
    },
    async getAuthorizedActor() {
      return makeActor()
    },
    async applyTransition(input) {
      calls.applyTransition += 1
      return transitionConversationState(input)
    },
    ...overrides,
  }

  return { deps, calls }
}

test('conversation state: take control moves conversation to HUMAN_ASSIGNED', () => {
  const result = transitionConversationState({
    action: 'take_control',
    actor: makeActor(),
    conversation: makeConversation(),
    occurredAt: '2026-07-19T08:00:00.000Z',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.status, 'human_assigned')
  assert.equal(result.to.ownershipMode, 'human')
  assert.equal(result.to.assignedStaffId, 'staff-1')
  assert.equal(result.to.aiPausedAt, '2026-07-19T08:00:00.000Z')
})

test('conversation state: human reply activates HUMAN_ACTIVE and self-assigns', () => {
  const result = transitionConversationState({
    action: 'human_reply',
    actor: makeActor(),
    conversation: makeConversation(),
    occurredAt: '2026-07-19T08:05:00.000Z',
    reason: 'manual_reply',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.status, 'human_active')
  assert.equal(result.to.ownershipMode, 'human')
  assert.equal(result.to.assignedStaffId, 'staff-1')
})

test('conversation state: human message echo pauses AI and preserves current assignee when known', () => {
  const result = transitionConversationState({
    action: 'human_message_echo',
    actor: {
      tenantId: 'tenant-a',
      userId: null,
      staffId: null,
      role: 'system',
      displayName: 'WhatsApp Business App',
    },
    conversation: makeConversation({
      status: 'ai_active',
      ownershipMode: 'ai',
      assignedStaffId: 'staff-1',
      aiPausedAt: null,
    }),
    occurredAt: '2026-07-20T09:15:00.000Z',
    reason: 'message.echoed',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.status, 'human_active')
  assert.equal(result.to.ownershipMode, 'human')
  assert.equal(result.to.assignedStaffId, 'staff-1')
  assert.equal(result.to.aiPausedAt, '2026-07-20T09:15:00.000Z')
})

test('conversation state: repeated human message echo is idempotent once AI is already paused by human ownership', () => {
  const result = transitionConversationState({
    action: 'human_message_echo',
    actor: {
      tenantId: 'tenant-a',
      userId: null,
      staffId: null,
      role: 'system',
      displayName: 'WhatsApp Business App',
    },
    conversation: makeConversation({
      status: 'human_active',
      ownershipMode: 'human',
      assignedStaffId: null,
      aiPausedAt: '2026-07-20T09:15:00.000Z',
    }),
    occurredAt: '2026-07-20T09:20:00.000Z',
  })

  assert.equal(result.changed, false)
  assert.equal(result.summary, null)
})

test('conversation state: release control pauses AI and clears assignee', () => {
  const result = transitionConversationState({
    action: 'release_control',
    actor: makeActor(),
    conversation: makeConversation({
      status: 'human_active',
      ownershipMode: 'human',
      assignedStaffId: 'staff-1',
      aiPausedAt: '2026-07-19T08:00:00.000Z',
    }),
    occurredAt: '2026-07-19T08:10:00.000Z',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.status, 'ai_paused')
  assert.equal(result.to.ownershipMode, 'hybrid')
  assert.equal(result.to.assignedStaffId, null)
  assert.equal(result.to.aiPausedAt, '2026-07-19T08:10:00.000Z')
})

test('conversation state: return to AI clears pause and ownership lock', () => {
  const result = transitionConversationState({
    action: 'return_to_ai',
    actor: makeActor(),
    conversation: makeConversation({
      status: 'ai_paused',
      ownershipMode: 'hybrid',
      assignedStaffId: null,
      aiPausedAt: '2026-07-19T08:10:00.000Z',
    }),
    occurredAt: '2026-07-19T08:15:00.000Z',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.status, 'ai_active')
  assert.equal(result.to.ownershipMode, 'ai')
  assert.equal(result.to.assignedStaffId, null)
  assert.equal(result.to.aiPausedAt, null)
})

test('conversation state: release control rejects invalid transition from fresh conversation', () => {
  assert.throws(
    () =>
      transitionConversationState({
        action: 'release_control',
        actor: makeActor(),
        conversation: makeConversation(),
        occurredAt: '2026-07-19T08:20:00.000Z',
      }),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'INVALID_TRANSITION')
      assert.equal(error.httpStatus, 409)
      return true
    },
  )
})

test('conversation state: plain staff cannot steal another operator conversation', () => {
  assert.throws(
    () =>
      transitionConversationState({
        action: 'take_control',
        actor: makeActor({
          role: 'staff',
          staffId: 'staff-2',
          displayName: 'Luca',
        }),
        conversation: makeConversation({
          status: 'human_assigned',
          ownershipMode: 'human',
          assignedStaffId: 'staff-1',
          aiPausedAt: '2026-07-19T08:00:00.000Z',
        }),
        occurredAt: '2026-07-19T08:25:00.000Z',
      }),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'OWNERSHIP_CONFLICT')
      return true
    },
  )
})

test('conversation state: receptionist can override another assignee conservatively', () => {
  const result = transitionConversationState({
    action: 'take_control',
    actor: makeActor({
      staffId: 'staff-2',
      displayName: 'Luca',
    }),
    conversation: makeConversation({
      status: 'human_assigned',
      ownershipMode: 'human',
      assignedStaffId: 'staff-1',
      aiPausedAt: '2026-07-19T08:00:00.000Z',
    }),
    occurredAt: '2026-07-19T08:30:00.000Z',
    reason: 'handoff shift',
  })

  assert.equal(result.changed, true)
  assert.equal(result.to.assignedStaffId, 'staff-2')
  assert.equal(result.to.status, 'human_assigned')
})

test('conversation state: take control is idempotent for the same operator', () => {
  const result = transitionConversationState({
    action: 'take_control',
    actor: makeActor(),
    conversation: makeConversation({
      status: 'human_active',
      ownershipMode: 'human',
      assignedStaffId: 'staff-1',
      aiPausedAt: '2026-07-19T08:00:00.000Z',
    }),
    occurredAt: '2026-07-19T08:35:00.000Z',
  })

  assert.equal(result.changed, false)
  assert.equal(result.summary, null)
})

test('conversation state core: unauthenticated user is rejected before transition', async () => {
  const { deps, calls } = makeDeps({
    async getAuthenticatedUserId() {
      return null
    },
  })

  await assert.rejects(
    () =>
      updateConversationStateCore(
        {
          conversationId: CONVERSATION_ID,
          action: 'take_control',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'UNAUTHENTICATED')
      return true
    },
  )

  assert.equal(calls.applyTransition, 0)
})

test('conversation state core: inactive or unauthorized staff stays blocked', async () => {
  const { deps, calls } = makeDeps({
    async getAuthorizedActor() {
      return null
    },
  })

  await assert.rejects(
    () =>
      updateConversationStateCore(
        {
          conversationId: CONVERSATION_ID,
          action: 'take_control',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'FORBIDDEN')
      assert.equal(error.httpStatus, 403)
      return true
    },
  )

  assert.equal(calls.applyTransition, 0)
})

test('conversation state core: cross-tenant conversation remains hidden', async () => {
  const { deps, calls } = makeDeps({
    async getRequestTenantId() {
      return 'tenant-b'
    },
  })

  await assert.rejects(
    () =>
      updateConversationStateCore(
        {
          conversationId: CONVERSATION_ID,
          action: 'take_control',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'CROSS_TENANT_CONVERSATION')
      assert.equal(error.httpStatus, 404)
      return true
    },
  )

  assert.equal(calls.applyTransition, 0)
})

test('conversation state core: race conflict propagates as 409', async () => {
  const { deps } = makeDeps({
    async applyTransition() {
      throw new ConversationStateError(
        'CONVERSATION_STATE_CONFLICT',
        409,
        'La conversazione e stata aggiornata da un altro operatore. Ricarica e riprova.',
      )
    },
  })

  await assert.rejects(
    () =>
      updateConversationStateCore(
        {
          conversationId: CONVERSATION_ID,
          action: 'release_control',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ConversationStateError)
      assert.equal(error.code, 'CONVERSATION_STATE_CONFLICT')
      return true
    },
  )
})
