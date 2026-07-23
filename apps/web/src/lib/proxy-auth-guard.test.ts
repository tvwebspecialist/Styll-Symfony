import test from 'node:test'
import assert from 'node:assert/strict'

import { NextRequest, NextResponse } from 'next/server.js'

import {
  applyProxyAuthGuards,
  hasPlausibleStaffSessionCookie,
  hasPlausibleSupabaseSessionCookie,
  hasPlausibleSymfonyStaffSessionCookie,
  isPublicAuthBootstrapPath,
  type ProxyAuthGuardDependencies,
  type ProxyAuthGuardInput,
  type ProxyAuthUser,
} from './proxy-auth-guard.ts'
import type { CspOptions } from './security/csp'

const SECURITY_OPTIONS: CspOptions = {
  allowEmbedding: false,
  isDev: true,
  rootDomain: 'styll.it',
}

function makeRequest(url: string, cookieHeader?: string) {
  return new NextRequest(url, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
  })
}

function makeAuthCookie(name: string = 'sb-demo-auth-token') {
  const session = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: 'bearer',
  }
  return `${name}=base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`
}

function createBaseInput(
  request: NextRequest,
  response: NextResponse,
  overrides: Partial<ProxyAuthGuardInput> = {}
): ProxyAuthGuardInput {
  return {
    request,
    response,
    securityOptions: SECURITY_OPTIONS,
    rootDomain: 'styll.it',
    isSubdomainRequest: false,
    isPwaRoute: false,
    isProtected: false,
    isAdmin: false,
    isOnboarding: false,
    isAuthPage: false,
    isLegacyComplete: false,
    onboardingCompletePath: '/onboarding/complete',
    shadowCookieValue: null,
    ...overrides,
  }
}

function createDeps(
  overrides: Partial<ProxyAuthGuardDependencies> = {}
): ProxyAuthGuardDependencies {
  return {
    applySecurityHeaders: (response) => response,
    clearShadowCookie: (response) => {
      response.cookies.set('styll_impersonate_tenant', '', { maxAge: 0, path: '/' })
    },
    getUser: async (): Promise<ProxyAuthUser | null> => null,
    getValidatedShadowTenantId: async () => null,
    getIsSuperadmin: async () => false,
    getOnboardingCompleted: async () => false,
    getActiveStaffTenantIds: async () => [],
    getTenantSlug: async () => null,
    ...overrides,
  }
}

test('public auth bootstrap detection includes login, register, forgot-password and verifica-email', () => {
  assert.equal(isPublicAuthBootstrapPath('/login'), true)
  assert.equal(isPublicAuthBootstrapPath('/register'), true)
  assert.equal(isPublicAuthBootstrapPath('/forgot-password'), true)
  assert.equal(isPublicAuthBootstrapPath('/verifica-email'), true)
  assert.equal(isPublicAuthBootstrapPath('/dashboard'), false)
})

test('Supabase auth cookie detection accepts session, chunked session and PKCE verifier cookies', () => {
  assert.equal(hasPlausibleSupabaseSessionCookie(['sb-demo-auth-token']), true)
  assert.equal(hasPlausibleSupabaseSessionCookie(['sb-demo-auth-token.0']), true)
  assert.equal(hasPlausibleSupabaseSessionCookie(['sb-demo-auth-token-code-verifier']), true)
  assert.equal(hasPlausibleSupabaseSessionCookie(['styll_cookie_consent_v1']), false)
})

test('Symfony JWT cookie detection accepts the dedicated staff cookie', () => {
  assert.equal(hasPlausibleSymfonyStaffSessionCookie(['styll_symfony_staff_jwt']), true)
  assert.equal(hasPlausibleSymfonyStaffSessionCookie(['sb-demo-auth-token']), false)
  assert.equal(hasPlausibleStaffSessionCookie(['styll_symfony_staff_jwt']), true)
})

test('GET anonymous /login returns without calling getUser', async () => {
  const request = makeRequest('https://styll.it/login')
  const response = NextResponse.next({ request })
  let getUserCalls = 0

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, { isAuthPage: true }),
    createDeps({
      getUser: async () => {
        getUserCalls += 1
        return null
      },
    })
  )

  assert.equal(result, null)
  assert.equal(getUserCalls, 0)
})

test('GET anonymous /register returns without calling getUser', async () => {
  const request = makeRequest('https://styll.it/register?token=test')
  const response = NextResponse.next({ request })
  let getUserCalls = 0

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, { isAuthPage: true }),
    createDeps({
      getUser: async () => {
        getUserCalls += 1
        return null
      },
    })
  )

  assert.equal(result, null)
  assert.equal(getUserCalls, 0)
})

test('authenticated user on /login still follows the existing tenant redirect', async () => {
  const request = makeRequest('https://styll.it/login', makeAuthCookie())
  const response = NextResponse.next({ request })
  let getUserCalls = 0

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, { isAuthPage: true }),
    createDeps({
      getUser: async () => {
        getUserCalls += 1
        return { id: 'user-1' }
      },
      getOnboardingCompleted: async () => true,
      getActiveStaffTenantIds: async () => ['tenant-1'],
      getTenantSlug: async () => 'acme',
    })
  )

  assert.ok(result)
  assert.equal(getUserCalls, 1)
  assert.equal(result.status, 307)
  assert.equal(result.headers.get('location'), 'https://acme-dashboard.styll.it/')
})

test('authenticated user on /register preserves localhost port when redirecting to a tenant dashboard', async () => {
  const request = makeRequest('http://localhost:3000/register', makeAuthCookie())
  const response = NextResponse.next({ request })

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, {
      isAuthPage: true,
      rootDomain: 'localhost:3000',
      securityOptions: {
        ...SECURITY_OPTIONS,
        rootDomain: 'localhost:3000',
      },
    }),
    createDeps({
      getUser: async () => ({ id: 'user-1' }),
      getOnboardingCompleted: async () => true,
      getActiveStaffTenantIds: async () => ['tenant-1'],
      getTenantSlug: async () => 'demo',
    })
  )

  assert.ok(result)
  assert.equal(result.status, 307)
  assert.equal(result.headers.get('location'), 'http://demo-dashboard.localhost:3000/')
})

test('anonymous dashboard requests stay protected', async () => {
  const request = makeRequest('https://styll.it/dashboard')
  const response = NextResponse.next({ request })
  let getUserCalls = 0

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, { isProtected: true }),
    createDeps({
      getUser: async () => {
        getUserCalls += 1
        return null
      },
    })
  )

  assert.ok(result)
  assert.equal(getUserCalls, 1)
  assert.equal(result.status, 307)
  assert.equal(result.headers.get('location'), 'https://styll.it/login?redirectTo=%2Fdashboard')
})

test('redirect responses preserve refreshed Supabase cookies', async () => {
  const request = makeRequest('https://styll.it/login', makeAuthCookie())
  const response = NextResponse.next({ request })

  const result = await applyProxyAuthGuards(
    createBaseInput(request, response, { isAuthPage: true }),
    createDeps({
      getUser: async () => {
        response.cookies.set('sb-demo-auth-token', 'refreshed-session', { path: '/' })
        return { id: 'user-1' }
      },
      getOnboardingCompleted: async () => false,
    })
  )

  assert.ok(result)
  assert.equal(result.status, 307)
  assert.equal(result.headers.get('location'), 'https://styll.it/onboarding/step-1')
  assert.equal(result.cookies.get('sb-demo-auth-token')?.value, 'refreshed-session')
})
