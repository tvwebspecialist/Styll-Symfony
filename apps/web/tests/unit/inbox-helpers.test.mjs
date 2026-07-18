import test from 'node:test'
import assert from 'node:assert/strict'

// Import from the REAL module — no copies.
import {
  formatTime,
  formatMsgTime,
  getInitials,
  makeCancellableLoad,
  triggerPreviewText,
  triggerIncrementsUnread,
} from '../../src/components/dashboard/marketing/inbox-utils.ts'

// ── formatTime ───────────────────────────────────────────────────────────────

test('formatTime: null → empty string', () => {
  assert.equal(formatTime(null), '')
})

test('formatTime: invalid ISO → empty string, no throw', () => {
  assert.equal(formatTime('not-a-date'), '')
  assert.equal(formatTime(''), '')
  assert.equal(formatTime('2026-99-99'), '') // invalid month
})

test('formatTime: today → HH:MM pattern', () => {
  assert.match(formatTime(new Date().toISOString()), /^\d{2}:\d{2}$/)
})

test('formatTime: yesterday → "Ieri"', () => {
  const yesterday = new Date(Date.now() - 86400000).toISOString()
  assert.equal(formatTime(yesterday), 'Ieri')
})

// ── formatMsgTime ────────────────────────────────────────────────────────────

test('formatMsgTime: empty string → empty string, no throw', () => {
  assert.equal(formatMsgTime(''), '')
})

test('formatMsgTime: garbage → empty string, no throw', () => {
  assert.equal(formatMsgTime('garbage'), '')
})

test('formatMsgTime: valid ISO → HH:MM', () => {
  assert.match(formatMsgTime('2026-07-18T10:30:00.000Z'), /^\d{2}:\d{2}$/)
})

// ── getInitials ───────────────────────────────────────────────────────────────

test('getInitials: full name → two uppercase initials', () => {
  assert.equal(getInitials('Luca Ferretti', null), 'LF')
})

test('getInitials: single word → first 2 chars uppercase', () => {
  assert.equal(getInitials('Luca', null), 'LU')
})

test('getInitials: whitespace-only → falls through to phone', () => {
  assert.equal(getInitials('   ', '+39333111222'), '22')
})

test('getInitials: null name, phone → last 2 digits', () => {
  assert.equal(getInitials(null, '+39333111333'), '33')
})

test('getInitials: null name, null phone → "?"', () => {
  assert.equal(getInitials(null, null), '?')
})

test('getInitials: empty string → falls through to phone', () => {
  assert.equal(getInitials('', '+39000000099'), '99')
})

test('getInitials: multiple internal spaces → splits correctly', () => {
  assert.equal(getInitials('Mario  Rossi', null), 'MR')
})

test('getInitials: single letter → returns letter, no crash', () => {
  const result = getInitials('X', null)
  assert.equal(typeof result, 'string')
  assert.ok(result.length > 0)
})

test('getInitials: international name → handles Unicode safely', () => {
  // All we guarantee: no crash and non-empty result
  const result = getInitials('Ñoño García', null)
  assert.equal(typeof result, 'string')
  assert.ok(result.length > 0)
})

// ── makeCancellableLoad — race condition ─────────────────────────────────────

test('makeCancellableLoad: success updates state', async () => {
  const collected = []
  const cancel = makeCancellableLoad(
    () => Promise.resolve(['item1', 'item2']),
    (data) => collected.push(...data),
    () => collected.push('ERROR'),
  )
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(collected, ['item1', 'item2'])
  cancel() // no-op after resolution
})

test('makeCancellableLoad: cancel before resolution → success discarded', async () => {
  const collected = []
  let resolve
  const cancel = makeCancellableLoad(
    () => new Promise((r) => { resolve = r }),
    (data) => collected.push(...data),
    () => collected.push('ERROR'),
  )
  cancel() // cancel while in-flight
  resolve(['stale'])
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(collected, [], 'stale resolution must be discarded')
})

test('makeCancellableLoad: simulates conversation A→B race condition', async () => {
  // User clicks conv A, then quickly clicks conv B before A resolves.
  // A resolves last. UI must show only B messages.
  const displayed = []
  let resolveA, resolveB

  const cancelA = makeCancellableLoad(
    () => new Promise((r) => { resolveA = r }),
    (msgs) => displayed.push({ from: 'A', msgs }),
    () => {},
  )

  // User switches to B — cancel A, start B
  cancelA()
  const cancelB = makeCancellableLoad(  // eslint-disable-line @typescript-eslint/no-unused-vars
    () => new Promise((r) => { resolveB = r }),
    (msgs) => displayed.push({ from: 'B', msgs }),
    () => {},
  )

  // B resolves first
  resolveB(['b1', 'b2'])
  await new Promise((r) => setTimeout(r, 0))

  // A resolves later (stale)
  resolveA(['a1', 'a2'])
  await new Promise((r) => setTimeout(r, 0))

  assert.equal(displayed.length, 1, 'only one update must reach state')
  assert.equal(displayed[0].from, 'B', 'displayed messages must be from B')
  assert.deepEqual(displayed[0].msgs, ['b1', 'b2'])
})

test('makeCancellableLoad: error branch calls onError', async () => {
  const errors = []
  makeCancellableLoad(
    () => Promise.reject(new Error('db down')),
    () => {},
    (err) => errors.push(err),
  )
  await new Promise((r) => setTimeout(r, 0))
  assert.equal(errors.length, 1)
  assert.ok(errors[0] instanceof Error)
})

test('makeCancellableLoad: cancel before error → error discarded', async () => {
  const errors = []
  let reject
  const cancel = makeCancellableLoad(
    () => new Promise((_, r) => { reject = r }),
    () => {},
    (err) => errors.push(err),
  )
  cancel()
  reject(new Error('late error'))
  await new Promise((r) => setTimeout(r, 0))
  assert.deepEqual(errors, [], 'cancelled error must be discarded')
})

// ── Trigger logic (mirrors handle_inbox_message_insert SQL) ──────────────────
// Tests SQL logic as pure JS to verify trigger behaviour without a live DB.

test('trigger: inbound+customer → unread_count increments', () => {
  assert.equal(triggerIncrementsUnread('inbound', 'customer'), true)
})

test('trigger: outbound message → unread_count unchanged', () => {
  assert.equal(triggerIncrementsUnread('outbound', 'assistant'), false)
  assert.equal(triggerIncrementsUnread('outbound', 'human'), false)
  assert.equal(triggerIncrementsUnread('outbound', 'system'), false)
})

test('trigger: system direction → unread_count unchanged', () => {
  assert.equal(triggerIncrementsUnread('system', 'system'), false)
})

test('trigger: inbound non-customer (AI echo) → unread_count unchanged', () => {
  assert.equal(triggerIncrementsUnread('inbound', 'assistant'), false)
  assert.equal(triggerIncrementsUnread('inbound', 'human'), false)
})

test('trigger: null body_text → preview is "[media]"', () => {
  assert.equal(triggerPreviewText(null), '[media]')
})

test('trigger: whitespace-only body_text → preview is "[media]"', () => {
  assert.equal(triggerPreviewText('   '), '[media]')
})

test('trigger: normal body_text → trimmed and capped at 240 chars', () => {
  assert.equal(triggerPreviewText('  Ciao  '), 'Ciao')
  const long = 'x'.repeat(300)
  assert.equal(triggerPreviewText(long).length, 240)
})

test('trigger: body_text at exactly 240 chars → not truncated', () => {
  const text = 'y'.repeat(240)
  assert.equal(triggerPreviewText(text), text)
})
