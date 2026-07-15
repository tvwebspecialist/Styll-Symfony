import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyPushEndpointClaim } from '../../src/lib/push/endpoint-ownership.ts'

test('classifyPushEndpointClaim treats a missing row as unclaimed', () => {
  assert.equal(classifyPushEndpointClaim(null, 'user-1'), 'unclaimed')
})

test('classifyPushEndpointClaim allows the current owner to refresh the endpoint', () => {
  assert.equal(
    classifyPushEndpointClaim({ profileId: 'user-1' }, 'user-1'),
    'owned_by_request_user',
  )
})

test('classifyPushEndpointClaim blocks cross-user endpoint reuse', () => {
  assert.equal(
    classifyPushEndpointClaim({ profileId: 'user-2' }, 'user-1'),
    'owned_by_other_user',
  )
})
