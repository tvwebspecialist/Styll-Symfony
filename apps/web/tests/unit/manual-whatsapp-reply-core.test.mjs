import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ManualWhatsAppReplyError,
  sendManualWhatsAppReplyCore,
} from '../../src/lib/messaging/manual-whatsapp-reply-core.ts'

const CONVERSATION_ID = '11111111-1111-4111-8111-111111111111'

function makeDeps(overrides = {}) {
  const calls = {
    createDraft: 0,
    dispatchMessage: 0,
    persistSentMessage: 0,
    markDispatchFailure: 0,
    markPersistenceFailure: 0,
  }

  const deps = {
    async getAuthenticatedUserId() {
      return 'user-1'
    },
    async getRequestTenantId() {
      return 'tenant-a'
    },
    async getConversation() {
      return {
        id: CONVERSATION_ID,
        tenantId: 'tenant-a',
        provider: 'meta_whatsapp',
        phoneNumberId: '1235189433012563',
        recipient: '39333111222',
        clientId: 'client-1',
      }
    },
    async getAuthorizedActor() {
      return {
        tenantId: 'tenant-a',
        userId: 'user-1',
        staffId: 'staff-1',
        role: 'receptionist',
      }
    },
    async findRecentDuplicate() {
      return null
    },
    async createDraft() {
      calls.createDraft += 1
      return {
        messageLogId: 'log-1',
        outboxId: 'outbox-1',
      }
    },
    async dispatchMessage() {
      calls.dispatchMessage += 1
      return {
        messageId: 'wamid.outbound-1',
        occurredAt: '2026-07-19T08:00:00.000Z',
        providerPayload: { ok: true },
        deliveryStatus: 'sent',
      }
    },
    async persistSentMessage() {
      calls.persistSentMessage += 1
      return {
        id: 'msg-1',
        conversationId: CONVERSATION_ID,
        bodyText: 'Ciao Luca',
        direction: 'outbound',
        authorKind: 'human',
        createdAt: '2026-07-19T08:00:00.000Z',
        usedTemplate: false,
        deliveryStatus: 'sent',
      }
    },
    async markDispatchFailure() {
      calls.markDispatchFailure += 1
    },
    async markPersistenceFailure() {
      calls.markPersistenceFailure += 1
    },
    ...overrides,
  }

  return { deps, calls }
}

test('manual reply: successful send returns stable outbound payload', async () => {
  const { deps, calls } = makeDeps()

  const result = await sendManualWhatsAppReplyCore(
    {
      conversationId: CONVERSATION_ID,
      text: '  Ciao Luca  ',
    },
    deps,
  )

  assert.equal(result.ok, true)
  assert.equal(result.duplicate, false)
  assert.equal(result.message.id, 'msg-1')
  assert.equal(result.message.bodyText, 'Ciao Luca')
  assert.equal(calls.createDraft, 1)
  assert.equal(calls.dispatchMessage, 1)
  assert.equal(calls.persistSentMessage, 1)
  assert.equal(calls.markDispatchFailure, 0)
  assert.equal(calls.markPersistenceFailure, 0)
})

test('manual reply: empty text is rejected before any side effect', async () => {
  const { deps, calls } = makeDeps()

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: '   \n   ',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'EMPTY_TEXT')
      assert.equal(error.httpStatus, 400)
      return true
    },
  )

  assert.equal(calls.createDraft, 0)
  assert.equal(calls.dispatchMessage, 0)
})

test('manual reply: unauthenticated user is rejected', async () => {
  const { deps, calls } = makeDeps({
    async getAuthenticatedUserId() {
      return null
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'UNAUTHENTICATED')
      assert.equal(error.httpStatus, 401)
      return true
    },
  )

  assert.equal(calls.createDraft, 0)
})

test('manual reply: unauthorized role is rejected', async () => {
  const { deps, calls } = makeDeps({
    async getAuthorizedActor() {
      return null
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'FORBIDDEN')
      assert.equal(error.httpStatus, 403)
      return true
    },
  )

  assert.equal(calls.createDraft, 0)
})

test('manual reply: inactive staff stays blocked', async () => {
  const { deps, calls } = makeDeps({
    async getAuthorizedActor() {
      return null
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'FORBIDDEN')
      return true
    },
  )

  assert.equal(calls.dispatchMessage, 0)
})

test('manual reply: cross-tenant conversation is hidden', async () => {
  const { deps, calls } = makeDeps({
    async getRequestTenantId() {
      return 'tenant-b'
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'CROSS_TENANT_CONVERSATION')
      assert.equal(error.httpStatus, 404)
      return true
    },
  )

  assert.equal(calls.createDraft, 0)
})

test('manual reply: missing conversation returns 404', async () => {
  const { deps, calls } = makeDeps({
    async getConversation() {
      return null
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'CONVERSATION_NOT_FOUND')
      assert.equal(error.httpStatus, 404)
      return true
    },
  )

  assert.equal(calls.createDraft, 0)
})

test('manual reply: Meta error marks the draft as failed', async () => {
  const { deps, calls } = makeDeps({
    async dispatchMessage() {
      calls.dispatchMessage += 1
      throw new ManualWhatsAppReplyError(
        'META_SEND_FAILED',
        502,
        'WhatsApp non ha accettato il messaggio.',
      )
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'META_SEND_FAILED')
      assert.equal(error.httpStatus, 502)
      return true
    },
  )

  assert.equal(calls.createDraft, 1)
  assert.equal(calls.dispatchMessage, 1)
  assert.equal(calls.markDispatchFailure, 1)
  assert.equal(calls.persistSentMessage, 0)
})

test('manual reply: Meta response without message id is rejected and marked failed', async () => {
  const { deps, calls } = makeDeps({
    async dispatchMessage() {
      calls.dispatchMessage += 1
      throw new ManualWhatsAppReplyError(
        'META_MISSING_MESSAGE_ID',
        502,
        'Meta ha risposto senza un message id valido.',
      )
    },
  })

  await assert.rejects(
    () =>
      sendManualWhatsAppReplyCore(
        {
          conversationId: CONVERSATION_ID,
          text: 'Ciao',
        },
        deps,
      ),
    (error) => {
      assert.ok(error instanceof ManualWhatsAppReplyError)
      assert.equal(error.code, 'META_MISSING_MESSAGE_ID')
      assert.equal(error.httpStatus, 502)
      return true
    },
  )

  assert.equal(calls.markDispatchFailure, 1)
  assert.equal(calls.persistSentMessage, 0)
})
