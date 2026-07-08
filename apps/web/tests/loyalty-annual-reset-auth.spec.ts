import { randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'
import type { Database } from '../src/types'
import {
  handleLoyaltyAnnualResetRequest,
  type LoyaltyAnnualResetDb,
} from '../../../supabase/functions/loyalty-annual-reset/handler'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey =
  process.env.PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const hasAuthEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)
const TEST_SECRET = 'loyalty-reset-test-secret'

type UserClient = SupabaseClient<Database>

interface AuthUserFixture {
  userId: string
  accessToken: string
  client: UserClient
}

interface LoyaltyResetAuthFixture {
  normalUser: AuthUserFixture
  clientUser: AuthUserFixture
  ownerUser: AuthUserFixture
  managerUser: AuthUserFixture
  cleanup: () => Promise<void>
}

function requireUserClient(): UserClient {
  if (!supabaseUrl || !publishableKey) {
    throw new Error(
      'Missing Playwright Supabase publishable environment. Set PLAYWRIGHT_SUPABASE_URL and PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY, or reuse NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function createAuthUser(
  service: ServiceClient,
  suffix: string,
  label: string,
  userType: 'staff' | 'client'
): Promise<AuthUserFixture> {
  const email = `playwright-loyalty-reset-${label}-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: userType },
  })
  await assertNoSupabaseError(`create ${label} auth user`, authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error(`create ${label} auth user: missing user id`)
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright Loyalty Reset ${label}`,
      user_type: userType,
    })
    .eq('id', userId)
  await assertNoSupabaseError(`seed ${label} profile`, profileError)

  const client = requireUserClient()
  const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  await assertNoSupabaseError(`sign in ${label}`, signInError)

  const accessToken = signInData.session?.access_token
  if (!accessToken) {
    throw new Error(`sign in ${label}: missing access token`)
  }

  return { userId, accessToken, client }
}

async function seedLoyaltyResetAuthFixture(): Promise<LoyaltyResetAuthFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const createdUserIds: string[] = []
  const createdStaffIds: string[] = []
  const createdClientIds: string[] = []

  const normalUser = await createAuthUser(service, suffix, 'normal', 'staff')
  const clientUser = await createAuthUser(service, suffix, 'client', 'client')
  const ownerUser = await createAuthUser(service, suffix, 'owner', 'staff')
  const managerUser = await createAuthUser(service, suffix, 'manager', 'staff')
  createdUserIds.push(
    normalUser.userId,
    clientUser.userId,
    ownerUser.userId,
    managerUser.userId
  )

  const { data: tenant, error: tenantError } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Loyalty Reset ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-loyalty-reset-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create loyalty reset tenant', tenantError)

  const tenantId = tenant?.id
  if (!tenantId) {
    throw new Error('create loyalty reset tenant: missing tenant id')
  }

  const { data: ownerStaff, error: ownerStaffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: ownerUser.userId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create owner membership', ownerStaffError)

  const { data: managerStaff, error: managerStaffError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: managerUser.userId,
      role: 'manager',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create manager membership', managerStaffError)

  if (ownerStaff?.id) createdStaffIds.push(ownerStaff.id)
  if (managerStaff?.id) createdStaffIds.push(managerStaff.id)

  const { data: clientRow, error: clientRowError } = await service
    .from('clients')
    .insert({
      email: `pwa-client-${suffix}@example.com`,
      full_name: 'Playwright Loyalty Reset PWA Client',
      marketing_consent: false,
      phone: `+39${Date.now().toString().slice(-9)}`,
      preferred_contact_channel: 'push',
      profile_id: clientUser.userId,
      tags: [],
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create client row', clientRowError)

  if (clientRow?.id) {
    createdClientIds.push(clientRow.id)
  }

  return {
    normalUser,
    clientUser,
    ownerUser,
    managerUser,
    cleanup: async () => {
      try {
        await Promise.all([
          normalUser.client.auth.signOut(),
          clientUser.client.auth.signOut(),
          ownerUser.client.auth.signOut(),
          managerUser.client.auth.signOut(),
        ])
      } catch {
        // best effort
      }

      if (createdClientIds.length > 0) {
        await service.from('clients').delete().in('id', createdClientIds)
      }
      if (createdStaffIds.length > 0) {
        await service.from('staff_members').delete().in('id', createdStaffIds)
      }
      await service.from('tenants').delete().eq('id', tenantId)

      for (const userId of createdUserIds) {
        await service.auth.admin.deleteUser(userId)
      }
    },
  }
}

function buildResetRequest(headers: HeadersInit = {}): Request {
  return new Request('https://example.test/functions/v1/loyalty-annual-reset', {
    method: 'POST',
    headers,
  })
}

function createNoopDb(): LoyaltyAnnualResetDb {
  return {
    from() {
      return {
        select() {
          return {
            lt: async () => ({ data: [], error: null }),
          }
        },
        update() {
          return {
            in() {
              return {
                select: async () => ({ error: null, count: 0 }),
              }
            },
          }
        },
      }
    },
  }
}

test.describe('loyalty annual reset authorization', () => {
  test('anon request is rejected', async () => {
    let createAdminClientCalled = false

    const response = await handleLoyaltyAnnualResetRequest(buildResetRequest(), {
      env: {
        supabaseUrl: 'https://example.supabase.co',
        serviceRoleKey: 'service-role',
        loyaltyResetSecret: TEST_SECRET,
      },
      createAdminClient: () => {
        createAdminClientCalled = true
        return createNoopDb()
      },
    })

    expect(response.status).toBe(401)
    expect(createAdminClientCalled).toBe(false)
  })

  test('wrong secret is rejected', async () => {
    let createAdminClientCalled = false

    const response = await handleLoyaltyAnnualResetRequest(
      buildResetRequest({
        authorization: 'Bearer wrong-secret',
      }),
      {
        env: {
          supabaseUrl: 'https://example.supabase.co',
          serviceRoleKey: 'service-role',
          loyaltyResetSecret: TEST_SECRET,
        },
        createAdminClient: () => {
          createAdminClientCalled = true
          return createNoopDb()
        },
      }
    )

    expect(response.status).toBe(401)
    expect(createAdminClientCalled).toBe(false)
  })

  test('internal request with valid secret passes', async () => {
    let createAdminClientCalled = false

    const response = await handleLoyaltyAnnualResetRequest(
      buildResetRequest({
        authorization: `Bearer ${TEST_SECRET}`,
      }),
      {
        env: {
          supabaseUrl: 'https://example.supabase.co',
          serviceRoleKey: 'service-role',
          loyaltyResetSecret: TEST_SECRET,
        },
        createAdminClient: () => {
          createAdminClientCalled = true
          return createNoopDb()
        },
      }
    )

    expect(response.status).toBe(200)
    expect(createAdminClientCalled).toBe(true)
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Nothing to reset',
      updated: 0,
    })
  })

  test.skip(!hasAuthEnv, 'Requires Supabase URL, publishable key, and service-role env for JWT auth tests.')

  test.describe.serial('real authenticated JWT callers are rejected', () => {
    let fixture: LoyaltyResetAuthFixture | null = null

    test.beforeAll(async () => {
      fixture = await seedLoyaltyResetAuthFixture()
    })

    test.afterAll(async () => {
      if (fixture) {
        await fixture.cleanup()
        fixture = null
      }
    })

    function getFixture(): LoyaltyResetAuthFixture {
      if (!fixture) {
        throw new Error('Loyalty reset auth fixture not initialized')
      }
      return fixture
    }

    async function expectJwtRejected(accessToken: string) {
      let createAdminClientCalled = false

      const response = await handleLoyaltyAnnualResetRequest(
        buildResetRequest({
          authorization: `Bearer ${accessToken}`,
        }),
        {
          env: {
            supabaseUrl: 'https://example.supabase.co',
            serviceRoleKey: 'service-role',
            loyaltyResetSecret: TEST_SECRET,
          },
          createAdminClient: () => {
            createAdminClientCalled = true
            return createNoopDb()
          },
        }
      )

      expect(response.status).toBe(401)
      expect(createAdminClientCalled).toBe(false)
    }

    test('authenticated normal user JWT is rejected', async () => {
      await expectJwtRejected(getFixture().normalUser.accessToken)
    })

    test('authenticated PWA client JWT is rejected', async () => {
      await expectJwtRejected(getFixture().clientUser.accessToken)
    })

    test('authenticated owner JWT is rejected', async () => {
      await expectJwtRejected(getFixture().ownerUser.accessToken)
    })

    test('authenticated manager JWT is rejected', async () => {
      await expectJwtRejected(getFixture().managerUser.accessToken)
    })
  })
})
