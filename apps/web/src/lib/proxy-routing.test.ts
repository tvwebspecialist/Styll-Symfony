import test from 'node:test'
import assert from 'node:assert/strict'

import { NextRequest } from 'next/server.js'

import { resolveTenantRewrite } from './proxy-routing.ts'

test('tenant path mode rewrite remains active in localhost development', () => {
  const env = process.env as Record<string, string | undefined>
  const previousNodeEnv = env.NODE_ENV
  env.NODE_ENV = 'development'

  try {
    const request = new NextRequest(
      'http://localhost:3000/team?_tenant_slug=acme&_tenant_type=dashboard',
      {
        headers: {
          host: 'localhost:3000',
        },
      }
    )

    const rewriteUrl = resolveTenantRewrite(request, 'styll.it')

    assert.ok(rewriteUrl)
    assert.equal(rewriteUrl.pathname, '/tenant/dashboard/acme/team')
    assert.equal(rewriteUrl.searchParams.get('_tenant_slug'), null)
    assert.equal(rewriteUrl.searchParams.get('_tenant_type'), null)
  } finally {
    if (previousNodeEnv === undefined) {
      Reflect.deleteProperty(env, 'NODE_ENV')
    } else {
      env.NODE_ENV = previousNodeEnv
    }
  }
})
