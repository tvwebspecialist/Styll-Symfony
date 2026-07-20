import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS,
  parseManualInboxOutboxPayload,
  planManualWhatsAppOutboxRetry,
} from '../../src/lib/messaging/manual-whatsapp-outbox-core.ts'

test('parseManualInboxOutboxPayload accepts valid manual inbox payloads', () => {
  const payload = parseManualInboxOutboxPayload({
    source: 'dashboard_manual_inbox',
    type: 'text',
    text: 'Ciao Luca',
    phone_number_id: '123456789',
    actor: {
      user_id: 'user-1',
      staff_id: 'staff-1',
      role: 'receptionist',
      display_name: 'Luca',
    },
  })

  assert.deepEqual(payload, {
    source: 'dashboard_manual_inbox',
    type: 'text',
    text: 'Ciao Luca',
    phone_number_id: '123456789',
    actor: {
      user_id: 'user-1',
      staff_id: 'staff-1',
      role: 'receptionist',
      display_name: 'Luca',
    },
    provider_result: undefined,
  })
})

test('parseManualInboxOutboxPayload rejects malformed or unsupported payloads', () => {
  assert.equal(parseManualInboxOutboxPayload(null), null)
  assert.equal(parseManualInboxOutboxPayload({ source: 'other' }), null)
  assert.equal(
    parseManualInboxOutboxPayload({
      source: 'dashboard_manual_inbox',
      type: 'text',
      text: '',
      phone_number_id: '123456789',
      actor: {
        user_id: 'user-1',
        staff_id: 'staff-1',
        role: 'receptionist',
      },
    }),
    null,
  )
})

test('planManualWhatsAppOutboxRetry schedules a bounded retry for retryable failures', () => {
  const now = new Date('2026-07-20T10:00:00.000Z')
  const retry = planManualWhatsAppOutboxRetry({
    attempts: 1,
    errorCode: 'META_SEND_FAILED',
    now,
  })

  assert.equal(retry.deadLetter, false)
  assert.equal(retry.status, 'pending')
  assert.equal(retry.scheduledFor, '2026-07-20T10:01:00.000Z')
})

test('planManualWhatsAppOutboxRetry dead-letters non-retryable and exhausted attempts', () => {
  const nonRetryable = planManualWhatsAppOutboxRetry({
    attempts: 1,
    errorCode: 'WHATSAPP_NOT_CONFIGURED',
  })
  assert.equal(nonRetryable.deadLetter, true)
  assert.equal(nonRetryable.status, 'failed')
  assert.equal(nonRetryable.scheduledFor, null)

  const exhausted = planManualWhatsAppOutboxRetry({
    attempts: MANUAL_WHATSAPP_OUTBOX_MAX_ATTEMPTS,
    errorCode: 'META_SEND_FAILED',
  })
  assert.equal(exhausted.deadLetter, true)
  assert.equal(exhausted.status, 'failed')
  assert.equal(exhausted.scheduledFor, null)
})
