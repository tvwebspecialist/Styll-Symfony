import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildSymfonyStaffMeHeaders,
  fetchSymfonyStaffMe,
  isSymfonyStaffContextEnabled,
  SymfonyStaffApiError,
} from '../../src/lib/symfony/staff-client.ts'

const ORIGINAL_FETCH = global.fetch
const ORIGINAL_FLAG = process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT

test.afterEach(() => {
  global.fetch = ORIGINAL_FETCH

  if (ORIGINAL_FLAG === undefined) {
    delete process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT
  } else {
    process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT = ORIGINAL_FLAG
  }
})

test('isSymfonyStaffContextEnabled is on by default and can be explicitly disabled', () => {
  delete process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT
  assert.equal(isSymfonyStaffContextEnabled(), true)

  process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT = 'false'
  assert.equal(isSymfonyStaffContextEnabled(), false)

  process.env.NEXT_PUBLIC_USE_SYMFONY_STAFF_CONTEXT = 'true'
  assert.equal(isSymfonyStaffContextEnabled(), true)
})

test('buildSymfonyStaffMeHeaders includes bearer auth and optional tenant slug', () => {
  assert.deepEqual(buildSymfonyStaffMeHeaders('jwt-token'), {
    Accept: 'application/json',
    Authorization: 'Bearer jwt-token',
  })

  assert.deepEqual(buildSymfonyStaffMeHeaders('jwt-token', ' tenant-b-api '), {
    Accept: 'application/json',
    Authorization: 'Bearer jwt-token',
    'X-Tenant-Slug': 'tenant-b-api',
  })
})

test('fetchSymfonyStaffMe returns parsed me payload and forwards tenant slug', async () => {
  let capturedUrl = ''
  let capturedInit = null

  global.fetch = async (url, init) => {
    capturedUrl = String(url)
    capturedInit = init ?? null

    return new Response(JSON.stringify({
      user: {
        id: 'user-1',
        email: 'staff@example.test',
        roles: ['ROLE_STAFF'],
      },
      profile: {
        id: 'user-1',
        userType: 'staff',
        fullName: 'Mario Rossi',
        phone: '+3900000000',
        avatarUrl: null,
        bio: null,
        language: 'it',
        timezone: 'Europe/Rome',
        notificationPreferences: {},
        onboardingCompleted: true,
        workMode: 'team',
      },
      currentTenant: {
        staffMemberId: 'staff-member-1',
        role: 'owner',
        tenant: {
          id: 'tenant-1',
          slug: 'tenant-a-api',
          businessName: 'Tenant A API Barber',
          logoUrl: null,
          status: 'active',
          timezone: 'Europe/Rome',
        },
      },
      currentRole: 'owner',
      otherTenants: [],
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  const payload = await fetchSymfonyStaffMe({
    jwt: 'jwt-token',
    tenantSlug: 'tenant-a-api',
  })

  assert.equal(capturedUrl, 'https://api.styll.it/api/me')
  assert.equal(capturedInit?.cache, 'no-store')
  assert.deepEqual(capturedInit?.headers, {
    Accept: 'application/json',
    Authorization: 'Bearer jwt-token',
    'X-Tenant-Slug': 'tenant-a-api',
  })
  assert.equal(payload.currentTenant?.tenant.slug, 'tenant-a-api')
  assert.equal(payload.profile.fullName, 'Mario Rossi')
})

test('fetchSymfonyStaffMe maps 401 responses to unauthorized errors', async () => {
  global.fetch = async () =>
    new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
      },
    })

  await assert.rejects(
    () => fetchSymfonyStaffMe({ jwt: 'jwt-token' }),
    (error) => {
      assert.ok(error instanceof SymfonyStaffApiError)
      assert.equal(error.code, 'unauthorized')
      assert.equal(error.details.status, 401)
      return true
    }
  )
})
