import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeMetaWhatsAppWebhook, metaWhatsAppAdapter } from '../../src/lib/messaging/meta-whatsapp-adapter.ts'

test('normalizeMetaWhatsAppWebhook parses inbound customer messages', () => {
  const events = normalizeMetaWhatsAppWebhook({
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: '123456789' },
          contacts: [{ wa_id: '39333111222', profile: { name: 'Luca' } }],
          messages: [{
            from: '39333111222',
            id: 'wamid.inbound-1',
            timestamp: '1784300400',
            text: { body: 'Ciao, avete posto domani?' },
            type: 'text',
          }],
        },
      }],
    }],
  })

  assert.equal(events.length, 1)
  assert.equal(events[0].eventType, 'message.received')
  assert.equal(events[0].contactDisplayName, 'Luca')
  assert.equal(events[0].text, 'Ciao, avete posto domani?')
  assert.equal(events[0].conversationKey, 'meta_whatsapp:123456789:39333111222')
})

test('normalizeMetaWhatsAppWebhook parses status updates separately from inbound messages', () => {
  const events = normalizeMetaWhatsAppWebhook({
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: '123456789' },
          statuses: [{
            id: 'wamid.outbound-1',
            recipient_id: '39333111222',
            status: 'delivered',
            timestamp: '1784300500',
          }],
        },
      }],
    }],
  })

  assert.equal(events.length, 1)
  assert.equal(events[0].eventType, 'message.delivered')
  assert.equal(events[0].direction, 'outbound')
  assert.equal(events[0].authorKind, 'system')
})

test('metaWhatsAppAdapter builds a minimal outbound text request', () => {
  const payload = metaWhatsAppAdapter.buildOutboundRequest({
    channel: 'whatsapp',
    provider: 'meta_whatsapp',
    conversationKey: 'meta_whatsapp:123:39333',
    recipient: '39333111222',
    text: 'Promemoria appuntamento',
  })

  assert.deepEqual(payload, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: '39333111222',
    type: 'text',
    text: {
      body: 'Promemoria appuntamento',
    },
  })
})
