import test from 'node:test'
import assert from 'node:assert/strict'

import {
  coalesceMessageLogStatus,
  getWebhookMessageStatus,
  toInboxDeliveryStatus,
} from '../../src/lib/messaging/message-delivery.ts'

test('message delivery: webhook status parsing maps sent/delivered/read/failed', () => {
  assert.equal(getWebhookMessageStatus('message.sent'), 'sent')
  assert.equal(getWebhookMessageStatus('message.delivered'), 'delivered')
  assert.equal(getWebhookMessageStatus('message.read'), 'read')
  assert.equal(getWebhookMessageStatus('message.failed'), 'failed')
})

test('message delivery: repeated webhook status updates stay idempotent', () => {
  assert.equal(coalesceMessageLogStatus('sent', 'sent'), 'sent')
  assert.equal(coalesceMessageLogStatus('delivered', 'delivered'), 'delivered')
  assert.equal(coalesceMessageLogStatus('read', 'read'), 'read')
})

test('message delivery: later weaker webhook events do not downgrade the stored status', () => {
  assert.equal(coalesceMessageLogStatus('delivered', 'sent'), 'delivered')
  assert.equal(coalesceMessageLogStatus('read', 'delivered'), 'read')
})

test('message delivery: failed does not override a delivered or read message', () => {
  assert.equal(coalesceMessageLogStatus('delivered', 'failed'), 'delivered')
  assert.equal(coalesceMessageLogStatus('read', 'failed'), 'read')
})

test('message delivery: inbox-facing status keeps queued as pending', () => {
  assert.equal(toInboxDeliveryStatus('queued'), 'pending')
  assert.equal(toInboxDeliveryStatus('sent'), 'sent')
  assert.equal(toInboxDeliveryStatus('read'), 'read')
  assert.equal(toInboxDeliveryStatus('failed'), 'failed')
})
