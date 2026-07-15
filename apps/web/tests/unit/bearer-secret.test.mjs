import test from 'node:test'
import assert from 'node:assert/strict'

import { matchesBearerTokenHeader } from '../../src/lib/security/bearer-secret.ts'

test('matchesBearerTokenHeader accepts the exact bearer secret', () => {
  assert.equal(matchesBearerTokenHeader('Bearer top-secret-token', 'top-secret-token'), true)
})

test('matchesBearerTokenHeader rejects a different token with the same length', () => {
  assert.equal(matchesBearerTokenHeader('Bearer top-secret-token', 'top-secret-tokee'), false)
})

test('matchesBearerTokenHeader rejects missing or malformed headers', () => {
  assert.equal(matchesBearerTokenHeader(null, 'top-secret-token'), false)
  assert.equal(matchesBearerTokenHeader('Basic top-secret-token', 'top-secret-token'), false)
  assert.equal(matchesBearerTokenHeader('Bearer short', 'top-secret-token'), false)
})
