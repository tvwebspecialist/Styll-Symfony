import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildPushBootstrapResponse,
  resolvePushConfig,
  toPushConfigError,
} from './config.ts'

const VALID_PUBLIC_KEY = 'B'.repeat(87)
const VALID_PRIVATE_KEY = 'a'.repeat(43)

test('push config stays disabled when all VAPID env vars are absent', () => {
  const config = resolvePushConfig({})
  const response = buildPushBootstrapResponse(config)

  assert.deepEqual(config, { state: 'disabled' })
  assert.equal(response.status, 503)
  assert.deepEqual(response.body, {
    error: 'Push not available',
    code: 'PUSH_DISABLED',
  })
})

test('partial VAPID configuration is misconfigured and fails closed', () => {
  const config = resolvePushConfig({
    VAPID_PUBLIC_KEY: VALID_PUBLIC_KEY,
    VAPID_EMAIL: 'mailto:ops@example.com',
  })

  assert.equal(config.state, 'misconfigured')
  assert.equal(config.reason, 'partial_config')

  const response = buildPushBootstrapResponse(config)
  assert.equal(response.status, 500)
  assert.deepEqual(response.body, {
    error: 'Push not available',
    code: 'PUSH_MISCONFIGURED',
  })
})

test('invalid VAPID subject is rejected without leaking secrets', () => {
  const privateKey = `${VALID_PRIVATE_KEY}secret`
  const config = resolvePushConfig({
    VAPID_PUBLIC_KEY: VALID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_EMAIL: 'ops@example.com',
  })

  assert.equal(config.state, 'misconfigured')
  assert.equal(config.reason, 'invalid_subject')

  const error = toPushConfigError(config)
  const serialized = JSON.stringify({
    config,
    error: { message: error.message, code: error.code, httpStatus: error.httpStatus },
  })

  assert.equal(error.code, 'PUSH_MISCONFIGURED')
  assert.equal(error.httpStatus, 500)
  assert.equal(serialized.includes(privateKey), false)
})

test('enabled VAPID config exposes only the public key to the client bootstrap response', () => {
  const privateKey = VALID_PRIVATE_KEY
  const config = resolvePushConfig({
    VAPID_PUBLIC_KEY: VALID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: privateKey,
    VAPID_EMAIL: 'mailto:ops@example.com',
  })

  assert.equal(config.state, 'enabled')

  const response = buildPushBootstrapResponse(config)
  assert.equal(response.status, 200)
  assert.deepEqual(response.body, {
    vapidPublicKey: VALID_PUBLIC_KEY,
  })
  assert.equal(JSON.stringify(response.body).includes(privateKey), false)
})
