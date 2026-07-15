import test from 'node:test'
import assert from 'node:assert/strict'

import { toPublicErrorMessage } from '../../src/lib/security/public-error.ts'

test('toPublicErrorMessage preserves explicitly recoverable messages', () => {
  const message = toPublicErrorMessage(
    new Error('proof expired'),
    'generic fallback',
    (value) => /expired/i.test(value),
  )

  assert.equal(message, 'proof expired')
})

test('toPublicErrorMessage redacts unexpected server errors', () => {
  const message = toPublicErrorMessage(
    new Error('duplicate key value violates unique constraint "pending_legal_proofs_pkey"'),
    'generic fallback',
    (value) => /expired/i.test(value),
  )

  assert.equal(message, 'generic fallback')
})

test('toPublicErrorMessage falls back for non-Error values', () => {
  const message = toPublicErrorMessage('raw string failure', 'generic fallback')

  assert.equal(message, 'generic fallback')
})
