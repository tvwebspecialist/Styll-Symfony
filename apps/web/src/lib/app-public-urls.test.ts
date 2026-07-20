import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildAppPublicUrls,
  deriveRuntimeLocationFromRequestHeaders,
  type AppRuntimeLocation,
} from './app-public-urls'

test('server-derived localhost location matches client localhost app URL output', () => {
  const headers = new Headers({
    host: 'localhost:3000',
    'x-forwarded-proto': 'http',
  })

  const serverLocation = deriveRuntimeLocationFromRequestHeaders(headers)
  const clientLocation: AppRuntimeLocation = {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
  }

  const previewParams = new URLSearchParams({ preview: '1' })

  assert.deepEqual(
    buildAppPublicUrls('demo-marco', serverLocation, previewParams),
    buildAppPublicUrls('demo-marco', clientLocation, previewParams),
  )
})

test('localhost request produces localhost host label and path-based app URL', () => {
  const result = buildAppPublicUrls('demo-marco', {
    protocol: 'http:',
    hostname: 'localhost',
    port: '3000',
  })

  assert.equal(result.hostLabel, 'localhost:3000 · demo-marco app')
  assert.equal(
    result.appUrl,
    'http://localhost:3000/?_tenant_slug=demo-marco&_tenant_type=app',
  )
  assert.equal(
    result.previewUrl,
    'http://localhost:3000/?_tenant_slug=demo-marco&_tenant_type=app',
  )
})

test('production request keeps subdomain app URL output stable', () => {
  const result = buildAppPublicUrls('demo-marco', {
    protocol: 'https:',
    hostname: 'demo-marco-dashboard.styll.it',
    port: '',
  })

  assert.equal(result.hostLabel, 'demo-marco-app.styll.it')
  assert.equal(result.appUrl, 'https://demo-marco-app.styll.it')
  assert.equal(result.previewUrl, 'https://demo-marco-app.styll.it/')
})
