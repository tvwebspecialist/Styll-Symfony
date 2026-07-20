import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'

import { verifyMetaWebhookSignature } from '../../src/lib/messaging/meta-whatsapp-signature.ts'

test('verifyMetaWebhookSignature accepts valid signature headers', () => {
  const rawBody = '{"object":"whatsapp_business_account"}'
  const secret = 'meta-app-secret'
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex')

  assert.equal(
    verifyMetaWebhookSignature(rawBody, `sha256=${digest}`, secret),
    true
  )
})

test('verifyMetaWebhookSignature rejects wrong signatures and allows disabled mode', () => {
  const rawBody = '{"object":"whatsapp_business_account"}'

  assert.equal(
    verifyMetaWebhookSignature(rawBody, 'sha256=deadbeef', 'meta-app-secret'),
    false
  )
  assert.equal(
    verifyMetaWebhookSignature(rawBody, null, ''),
    true
  )
})
