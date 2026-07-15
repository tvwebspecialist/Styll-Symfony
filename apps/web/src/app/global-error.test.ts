import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./global-error.tsx', import.meta.url), 'utf8')

test('global error surface is a client component wired to Sentry', () => {
  assert.match(source, /^'use client'/m)
  assert.match(source, /from '@sentry\/nextjs'/)
  assert.match(source, /Sentry\.captureException\(error\)/)
  assert.match(source, /reset:\s*\(\)\s*=>\s*void/)
  assert.match(source, /<html lang="it">/)
})
