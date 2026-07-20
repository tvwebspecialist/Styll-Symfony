import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildInboxRealtimeTenantFilter,
  extractRealtimeConversationId,
  shouldRefreshInboxMessagesFromLog,
} from '../../src/lib/messaging/inbox-realtime.ts'

test('buildInboxRealtimeTenantFilter scopes every channel to tenant_id', () => {
  assert.equal(buildInboxRealtimeTenantFilter('tenant-a'), 'tenant_id=eq.tenant-a')
})

test('extractRealtimeConversationId reads conversation ids from table rows', () => {
  assert.equal(extractRealtimeConversationId({ id: 'conv-1' }), 'conv-1')
  assert.equal(extractRealtimeConversationId({ conversation_id: 'conv-2' }), 'conv-2')
  assert.equal(
    extractRealtimeConversationId({ id: 'message-1', conversation_id: 'conv-3' }),
    'conv-3',
  )
  assert.equal(extractRealtimeConversationId({ id: '' }), null)
  assert.equal(extractRealtimeConversationId(null), null)
})

test('shouldRefreshInboxMessagesFromLog only reacts to timeline-relevant log types', () => {
  assert.equal(shouldRefreshInboxMessagesFromLog({ type: 'conversation_audit' }), true)
  assert.equal(shouldRefreshInboxMessagesFromLog({ type: 'internal_note' }), true)
  assert.equal(shouldRefreshInboxMessagesFromLog({ type: 'whatsapp_status' }), true)
  assert.equal(shouldRefreshInboxMessagesFromLog({ type: 'human_message_echo' }), false)
  assert.equal(shouldRefreshInboxMessagesFromLog({ type: 'customer_message' }), false)
})
