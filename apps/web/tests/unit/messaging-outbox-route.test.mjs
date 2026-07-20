import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const routeSource = readFileSync(
  resolve(process.cwd(), 'src/app/api/cron/messaging-outbox/route.ts'),
  'utf8',
)

test('cron messaging outbox route requires CRON_SECRET bearer auth and dispatches the worker', () => {
  assert.match(routeSource, /processPendingManualWhatsAppOutboxBatch/)
  assert.match(routeSource, /matchesBearerTokenHeader/)
  assert.match(routeSource, /process\.env\.CRON_SECRET/)
  assert.match(routeSource, /request\.headers\.get\('authorization'\)/)
})
