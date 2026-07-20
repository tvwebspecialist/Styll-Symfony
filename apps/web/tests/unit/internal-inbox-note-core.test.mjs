import test from 'node:test'
import assert from 'node:assert/strict'

import {
  INTERNAL_INBOX_NOTE_MAX_LENGTH,
  InternalInboxNoteError,
  addInternalInboxNoteCore,
  normalizeInternalInboxNoteText,
} from '../../src/lib/messaging/internal-inbox-note-core.ts'

function makeDeps(overrides = {}) {
  return {
    getAuthenticatedUserId: async () => 'user-1',
    getRequestTenantId: async () => 'tenant-a',
    getConversation: async (conversationId) => ({
      id: conversationId,
      tenantId: 'tenant-a',
    }),
    getAuthorizedActor: async () => ({
      tenantId: 'tenant-a',
      userId: 'user-1',
      staffId: 'staff-1',
      role: 'receptionist',
      displayName: 'Sara',
    }),
    createNote: async ({ actor, bodyText, conversation }) => ({
      id: 'note:1',
      conversationId: conversation.id,
      bodyText,
      direction: 'system',
      authorKind: 'human',
      authorStaffId: actor.staffId,
      authorName: actor.displayName,
      createdAt: '2026-07-20T09:00:00.000Z',
      usedTemplate: false,
      timelineKind: 'internal_note',
    }),
    ...overrides,
  }
}

test('normalizeInternalInboxNoteText trims lines and keeps intentional newlines', () => {
  assert.equal(
    normalizeInternalInboxNoteText('  Prima riga   \r\nSeconda riga\t \n\n'),
    'Prima riga\nSeconda riga',
  )
})

test('normalizeInternalInboxNoteText rejects empty content', () => {
  assert.throws(
    () => normalizeInternalInboxNoteText(' \n\t '),
    (error) => error instanceof InternalInboxNoteError && error.code === 'EMPTY_NOTE',
  )
})

test('normalizeInternalInboxNoteText rejects oversize notes', () => {
  assert.throws(
    () => normalizeInternalInboxNoteText('x'.repeat(INTERNAL_INBOX_NOTE_MAX_LENGTH + 1)),
    (error) => error instanceof InternalInboxNoteError && error.code === 'NOTE_TOO_LONG',
  )
})

test('addInternalInboxNoteCore creates a tenant-scoped internal note', async () => {
  const result = await addInternalInboxNoteCore({
    conversationId: '11111111-1111-4111-8111-111111111111',
    text: 'Cliente sensibile ai ritardi.',
  }, makeDeps())

  assert.equal(result.ok, true)
  assert.equal(result.note.timelineKind, 'internal_note')
  assert.equal(result.note.authorStaffId, 'staff-1')
  assert.equal(result.note.authorName, 'Sara')
})

test('addInternalInboxNoteCore rejects invalid conversation ids', async () => {
  await assert.rejects(
    () => addInternalInboxNoteCore({
      conversationId: 'bad-id',
      text: 'Nota',
    }, makeDeps()),
    (error) => error instanceof InternalInboxNoteError && error.code === 'INVALID_CONVERSATION_ID',
  )
})

test('addInternalInboxNoteCore rejects missing sessions', async () => {
  await assert.rejects(
    () => addInternalInboxNoteCore({
      conversationId: '11111111-1111-4111-8111-111111111111',
      text: 'Nota',
    }, makeDeps({
      getAuthenticatedUserId: async () => null,
    })),
    (error) => error instanceof InternalInboxNoteError && error.code === 'UNAUTHENTICATED',
  )
})

test('addInternalInboxNoteCore rejects cross-tenant access', async () => {
  await assert.rejects(
    () => addInternalInboxNoteCore({
      conversationId: '11111111-1111-4111-8111-111111111111',
      text: 'Nota',
    }, makeDeps({
      getRequestTenantId: async () => 'tenant-b',
    })),
    (error) => error instanceof InternalInboxNoteError && error.code === 'CROSS_TENANT_CONVERSATION',
  )
})

test('addInternalInboxNoteCore rejects inactive or unauthorized actors', async () => {
  await assert.rejects(
    () => addInternalInboxNoteCore({
      conversationId: '11111111-1111-4111-8111-111111111111',
      text: 'Nota',
    }, makeDeps({
      getAuthorizedActor: async () => null,
    })),
    (error) => error instanceof InternalInboxNoteError && error.code === 'FORBIDDEN',
  )
})
