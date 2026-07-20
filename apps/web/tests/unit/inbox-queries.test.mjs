import test from 'node:test'
import assert from 'node:assert/strict'

// Import the REAL query functions — no mocks of the functions under test.
// We mock only the DB client (injected dependency).
import {
  queryInboxConversations,
  queryInboxMessages,
} from '../../src/lib/messaging/inbox-queries.ts'

// ── Mock DB builder ───────────────────────────────────────────────────────────
//
// Builds a minimal Supabase-shaped mock with per-table response queues.
// Every query resolves on `.limit(...)`, which is enough for the inbox query
// layer implementation. Each table stores a list of captured filter maps.

function makeMockDb(tableResults, capturedCalls = {}) {
  const queues = new Map(
    Object.entries(tableResults).map(([table, results]) => [
      table,
      Array.isArray(results) ? results.slice() : [results],
    ])
  )

  return {
    from: (table) => {
      const queryState = { filters: {} }
      if (!capturedCalls[table]) capturedCalls[table] = []
      capturedCalls[table].push(queryState)

      const chain = {
        select: () => chain,
        eq: (col, val) => {
          queryState.filters[col] = val
          return chain
        },
        in: (col, val) => {
          queryState.filters[col] = val
          return chain
        },
        order: () => chain,
        limit: () => {
          const queue = queues.get(table) ?? []
          const next = queue.shift() ?? { data: [], error: null }
          queues.set(table, queue)
          return Promise.resolve(next)
        },
      }

      return chain
    },
  }
}

// ── queryInboxConversations ───────────────────────────────────────────────────

test('queryInboxConversations: returns mapped conversations', async () => {
  const raw = [{
    id: 'conv-1',
    contact_display_name: 'Luca Rossi',
    contact_phone: '+39333111222',
    last_message_preview: 'Ciao',
    last_message_at: '2026-07-18T10:00:00Z',
    unread_count: 3,
    status: 'new',
    ownership_mode: 'hybrid',
    assigned_staff_id: 'staff-1',
    ai_paused_at: '2026-07-19T08:00:00Z',
    channel: 'whatsapp',
  }]
  const db = makeMockDb({
    inbox_conversations: { data: raw, error: null },
  })

  const result = await queryInboxConversations(db, 'tenant-a')

  assert.equal(result.length, 1)
  assert.equal(result[0].id, 'conv-1')
  assert.equal(result[0].contactName, 'Luca Rossi')
  assert.equal(result[0].unreadCount, 3)
  assert.equal(result[0].ownershipMode, 'hybrid')
  assert.equal(result[0].assignedStaffId, 'staff-1')
  assert.equal(result[0].aiPausedAt, '2026-07-19T08:00:00Z')
})

test('queryInboxConversations: tenant_id filter is always applied', async () => {
  const capturedCalls = {}
  const db = makeMockDb({
    inbox_conversations: { data: [], error: null },
  }, capturedCalls)

  await queryInboxConversations(db, 'tenant-a')

  assert.equal(capturedCalls.inbox_conversations[0].filters['tenant_id'], 'tenant-a',
    'query must always filter by tenant_id')
})

test('queryInboxConversations: empty DB result → empty array, no error', async () => {
  const db = makeMockDb({
    inbox_conversations: { data: null, error: null },
  })
  const result = await queryInboxConversations(db, 'tenant-a')
  assert.deepEqual(result, [])
})

test('queryInboxConversations: DB error → throws, does NOT return []', async () => {
  const db = makeMockDb({
    inbox_conversations: { data: null, error: { message: 'connection refused' } },
  })

  await assert.rejects(
    () => queryInboxConversations(db, 'tenant-a'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('connection refused'))
      return true
    },
    'DB error must propagate as thrown Error, not silently return []'
  )
})

test('queryInboxConversations: unread_count null → defaults to 0', async () => {
  const db = makeMockDb({
    inbox_conversations: {
      data: [{
      id: 'conv-2',
      contact_display_name: null,
      contact_phone: null,
      last_message_preview: null,
      last_message_at: null,
      unread_count: null,  // DB could return null on brand-new row
      status: 'new',
      ownership_mode: 'human',
      assigned_staff_id: null,
      ai_paused_at: null,
      channel: 'whatsapp',
    }],
      error: null,
    },
  })
  const result = await queryInboxConversations(db, 'tenant-a')
  assert.equal(result[0].unreadCount, 0)
})

// ── queryInboxMessages ────────────────────────────────────────────────────────

test('queryInboxMessages: returns mapped messages', async () => {
  const db = makeMockDb({
    inbox_messages: {
      data: [
        {
          id: 'msg-1',
          body_text: 'Ciao, avete posto?',
          direction: 'inbound',
          author_kind: 'customer',
          author_staff_id: null,
          created_at: '2026-07-18T10:05:00Z',
          used_template: false,
          messages_log_id: null,
        },
        {
          id: 'msg-2',
          body_text: 'Ti confermo per domani.',
          direction: 'outbound',
          author_kind: 'human',
          author_staff_id: 'staff-1',
          created_at: '2026-07-18T10:06:00Z',
          used_template: false,
          messages_log_id: 'log-1',
        },
      ],
      error: null,
    },
    messages_log: [
      {
        data: [{ id: 'log-1', status: 'delivered' }],
        error: null,
      },
      {
        data: [
          {
            id: 'audit-1',
            type: 'conversation_audit',
            body_sent: 'Sara ha preso in carico la conversazione.',
            created_at: '2026-07-18T10:05:30Z',
            metadata: { action: 'take_control' },
          },
          {
            id: 'note-1',
            type: 'internal_note',
            body_sent: 'Cliente da richiamare nel pomeriggio.',
            created_at: '2026-07-18T10:05:45Z',
            metadata: {
              actor: {
                staff_id: 'staff-2',
                display_name: 'Giulia',
              },
            },
          },
        ],
        error: null,
      },
    ],
  })

  const result = await queryInboxMessages(db, 'tenant-a', 'conv-1')

  assert.equal(result.length, 4)
  assert.equal(result[0].bodyText, 'Ciao, avete posto?')
  assert.equal(result[0].direction, 'inbound')
  assert.equal(result[0].authorKind, 'customer')
  assert.equal(result[0].usedTemplate, false)
  assert.equal(result[1].timelineKind, 'conversation_audit')
  assert.equal(result[1].auditAction, 'take_control')
  assert.equal(result[2].timelineKind, 'internal_note')
  assert.equal(result[2].authorKind, 'human')
  assert.equal(result[2].authorStaffId, 'staff-2')
  assert.equal(result[2].authorName, 'Giulia')
  assert.equal(result[3].deliveryStatus, 'delivered')
  assert.equal(result[3].authorStaffId, 'staff-1')
})

test('queryInboxMessages: both tenant_id AND conversation_id filters applied (IDOR prevention)', async () => {
  const capturedCalls = {}
  const db = makeMockDb({
    inbox_messages: {
      data: [{
        id: 'msg-filter',
        body_text: 'Ciao',
        direction: 'outbound',
        author_kind: 'human',
        author_staff_id: 'staff-1',
        created_at: '2026-07-18T10:00:00Z',
        used_template: false,
        messages_log_id: 'log-filter',
      }],
      error: null,
    },
    messages_log: [
      { data: [{ id: 'log-filter', status: 'sent' }], error: null },
      { data: [], error: null },
    ],
  }, capturedCalls)

  await queryInboxMessages(db, 'tenant-a', 'conv-xyz')

  assert.equal(capturedCalls.inbox_messages[0].filters['tenant_id'], 'tenant-a',
    'must filter by tenant_id')
  assert.equal(capturedCalls.inbox_messages[0].filters['conversation_id'], 'conv-xyz',
    'must filter by conversation_id')
  assert.equal(capturedCalls.messages_log[0].filters['tenant_id'], 'tenant-a',
    'status query must keep tenant scope')
  assert.deepEqual(capturedCalls.messages_log[0].filters['id'], ['log-filter'],
    'status query must request only linked message_log ids')
  assert.equal(capturedCalls.messages_log[1].filters['tenant_id'], 'tenant-a',
    'audit query must keep tenant scope')
  assert.equal(capturedCalls.messages_log[1].filters['conversation_id'], 'conv-xyz',
    'audit query must keep conversation scope')
  assert.deepEqual(capturedCalls.messages_log[1].filters['type'], ['conversation_audit', 'internal_note'],
    'timeline query must only load audit and internal note rows')
})

test('queryInboxMessages: conversation from different tenant → empty (simulated IDOR attempt)', async () => {
  // The DB mock simulates what Supabase does: when tenant_id='tenant-a' AND
  // conversation_id belongs to 'tenant-b', the join returns 0 rows.
  // Here we simulate that the DB returns empty (correct behavior).
  const db = makeMockDb({
    inbox_messages: { data: [], error: null },
    messages_log: [
      { data: [], error: null },
      { data: [], error: null },
    ],
  })

  const result = await queryInboxMessages(db, 'tenant-a', 'conv-from-tenant-b')

  assert.deepEqual(result, [],
    'cross-tenant conversationId must return empty, never leak data')
})

test('queryInboxMessages: DB error → throws, not silently []', async () => {
  const db = makeMockDb({
    inbox_messages: { data: null, error: { message: 'timeout' } },
  })

  await assert.rejects(
    () => queryInboxMessages(db, 'tenant-a', 'conv-1'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('timeout'))
      return true
    },
    'DB error must propagate, not be swallowed'
  )
})

test('queryInboxMessages: body_text null → preserved as null (not coerced)', async () => {
  const db = makeMockDb({
    inbox_messages: {
      data: [{
      id: 'msg-media',
      body_text: null,
      direction: 'inbound',
      author_kind: 'customer',
      author_staff_id: null,
      created_at: '2026-07-18T10:00:00Z',
      used_template: false,
      messages_log_id: null,
    }],
      error: null,
    },
    messages_log: [
      { data: [], error: null },
      { data: [], error: null },
    ],
  })
  const result = await queryInboxMessages(db, 'tenant-a', 'conv-1')
  assert.equal(result[0].bodyText, null,
    'null body_text must be preserved — UI decides how to render media-only messages')
})

test('queryInboxMessages: used_template null → defaults to false', async () => {
  const db = makeMockDb({
    inbox_messages: {
      data: [{
      id: 'msg-3',
      body_text: 'Hello',
      direction: 'outbound',
      author_kind: 'assistant',
      author_staff_id: null,
      created_at: '2026-07-18T10:00:00Z',
      used_template: null,
      messages_log_id: 'log-2',
    }],
      error: null,
    },
    messages_log: [
      { data: [{ id: 'log-2', status: 'read' }], error: null },
      { data: [], error: null },
    ],
  })
  const result = await queryInboxMessages(db, 'tenant-a', 'conv-1')
  assert.equal(result[0].usedTemplate, false)
  assert.equal(result[0].deliveryStatus, 'read')
})

test('queryInboxMessages: missing status for historical outbound degrades safely to sent', async () => {
  const db = makeMockDb({
    inbox_messages: {
      data: [{
        id: 'msg-historical',
        body_text: 'Messaggio storico',
        direction: 'outbound',
        author_kind: 'human',
        author_staff_id: 'staff-1',
        created_at: '2026-07-18T10:00:00Z',
        used_template: false,
        messages_log_id: null,
      }],
      error: null,
    },
    messages_log: [
      { data: [], error: null },
      { data: [], error: null },
    ],
  })

  const result = await queryInboxMessages(db, 'tenant-a', 'conv-1')
  assert.equal(result[0].deliveryStatus, 'sent')
})

test('queryInboxMessages: audit log failure is surfaced', async () => {
  const db = makeMockDb({
    inbox_messages: {
      data: [{
        id: 'msg-audit',
        body_text: 'Ciao',
        direction: 'outbound',
        author_kind: 'human',
        author_staff_id: 'staff-1',
        created_at: '2026-07-18T10:00:00Z',
        used_template: false,
        messages_log_id: 'log-audit',
      }],
      error: null,
    },
    messages_log: [
      { data: [{ id: 'log-audit', status: 'sent' }], error: null },
      { data: null, error: { message: 'audit timeout' } },
    ],
  })

  await assert.rejects(
    () => queryInboxMessages(db, 'tenant-a', 'conv-1'),
    (err) => {
      assert.ok(err instanceof Error)
      assert.ok(err.message.includes('audit timeout'))
      return true
    }
  )
})

// ── Webhook deduplication — structural guarantee ──────────────────────────────
//
// The migration defines two UNIQUE constraints that prevent double-processing:
//
//   1. webhook_events_inbox(provider, external_id) UNIQUE
//      → Second arrival of the same webhook returns PostgreSQL error code 23505.
//        The handler catches 23505 and increments summary.duplicates (skips).
//
//   2. inbox_messages(meta_message_id) UNIQUE WHERE meta_message_id IS NOT NULL
//      → Even if the webhook dedup fails, inserting the same message again fails.
//
//   3. inbox_conversations(conversation_key) UNIQUE (inline column constraint)
//      → ensureConversationForEvent uses maybeSingle() on conversation_key,
//        then branches: update existing OR insert new. No duplicate conversations.
//
// These are DB-level guarantees; verified below via source inspection.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

test('deduplication: webhook handler catches 23505 and skips duplicates', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    path.join(dir, '../../src/app/api/webhooks/meta-whatsapp/route.ts'),
    'utf8'
  )
  assert.ok(src.includes("'23505'"), 'handler must detect duplicate key violation')
  assert.ok(src.includes('summary.duplicates++'), 'handler must count duplicates')
  assert.ok(src.includes('continue'), 'handler must skip processing on duplicate')
})

test('deduplication: migration declares UNIQUE on meta_message_id (secondary guard)', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  // Test file is at apps/web/tests/unit — go 4 levels up to repo root, then into supabase/
  const src = readFileSync(
    path.join(dir, '../../../../supabase/migrations/20260717093000_messaging_inbox_foundation.sql'),
    'utf8'
  )
  assert.ok(
    src.includes('idx_inbox_messages_meta_message_id'),
    'migration must have UNIQUE index on meta_message_id'
  )
  // Partial index — only non-null meta_message_id entries
  assert.ok(src.includes('where meta_message_id is not null'), 'index must be partial (WHERE meta_message_id IS NOT NULL)')
})

test('deduplication: migration declares UNIQUE on conversation_key', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(
    path.join(dir, '../../../../supabase/migrations/20260717093000_messaging_inbox_foundation.sql'),
    'utf8'
  )
  assert.ok(
    src.includes('conversation_key text not null unique'),
    'inbox_conversations.conversation_key must have UNIQUE constraint'
  )
})

// ── Auth guard — structural guarantee ─────────────────────────────────────────
//
// We cannot call requireInboxTenantContext in unit tests without a live Supabase
// session.
// The guarantees below are verified by inspecting the action source:
//
//   - getInboxConversations calls requireInboxTenantContext BEFORE any DB access
//   - getInboxMessages calls requireInboxTenantContext BEFORE any DB access
//   - tenant-role-guard exposes inbox access to owner/manager/receptionist/staff
//   - inactive/deleted staff are still blocked in getTenantRoleContext()
//
// Integration tests (Supabase local or staging) are required to exercise the
// actual 403 path. This is declared as a KNOWN OPEN RISK below.

test('auth guard: inbox.ts calls requireInboxTenantContext before DB (structural)', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(path.join(dir, '../../src/lib/actions/inbox.ts'), 'utf8')

  // Guard must be called BEFORE the DB client is instantiated inside the function body.
  // Search for the CALL (const db = ...), not the import, so the import line doesn't
  // trick the index comparison.
  const guardIdx = src.indexOf('await requireInboxTenantContext')
  const dbCallIdx = src.indexOf('const db = createMessagingAdminClient')
  assert.ok(guardIdx !== -1, 'requireInboxTenantContext must be present')
  assert.ok(dbCallIdx !== -1, 'createMessagingAdminClient() call must be present')
  assert.ok(guardIdx < dbCallIdx, 'requireInboxTenantContext must appear before createMessagingAdminClient() call')
})

test('auth guard: tenant-role-guard exposes staff access to inbox', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(path.join(dir, '../../src/lib/tenant-role-guard.ts'), 'utf8')
  const rolesLine = src.match(/export const INBOX_TENANT_ROLES\s*=\s*\[([^\]]+)\]/)
  assert.ok(rolesLine, 'INBOX_TENANT_ROLES constant must exist')
  assert.ok(rolesLine[1].includes("'owner'"), 'owner must be in inbox roles')
  assert.ok(rolesLine[1].includes("'manager'"), 'manager must be in inbox roles')
  assert.ok(rolesLine[1].includes("'receptionist'"), 'receptionist must be in inbox roles')
  assert.ok(rolesLine[1].includes("'staff'"), 'staff must be in inbox roles')
})

test('auth guard: tenant-role-guard still blocks inactive and deleted staff', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(path.join(dir, '../../src/lib/tenant-role-guard.ts'), 'utf8')
  assert.ok(src.includes(".eq('is_active', true)"), 'active-staff lookup must require is_active = true')
  assert.ok(src.includes(".is('deleted_at', null)"), 'active-staff lookup must require deleted_at IS NULL')
})

test('auth guard: tenant-role-guard scopes inbox access to the requested tenant', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(path.join(dir, '../../src/lib/tenant-role-guard.ts'), 'utf8')
  assert.ok(src.includes(".eq('tenant_id', tenantId)"), 'tenant role lookup must scope staff membership by tenant_id')
})

test('tenant context: active tenant fallback ignores deleted staff memberships', () => {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  const src = readFileSync(path.join(dir, '../../src/lib/tenant-context.ts'), 'utf8')
  assert.ok(src.includes(".eq('is_active', true)"), 'active tenant fallback must require is_active = true')
  assert.ok(src.includes(".is('deleted_at', null)"), 'active tenant fallback must require deleted_at IS NULL')
})
