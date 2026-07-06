import { randomBytes, randomUUID } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'
import type { Database } from '../src/types'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey =
  process.env.PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const hasSupabaseAuthEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)

type UserClient = SupabaseClient<Database>

interface UserFixture {
  userId: string
  email: string
  password: string
  client: UserClient
  cleanup: () => Promise<void>
}

function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
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

async function createAuthenticatedUserFixture(
  service: ServiceClient,
  prefix: string,
  userType: 'client' | 'staff' = 'client'
): Promise<UserFixture> {
  const email = randomEmail(prefix)
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: userType },
  })
  await assertNoSupabaseError('create auth user', authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error('create auth user: missing user id')
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      avatar_url: null,
      bio: null,
      email,
      email_verified: true,
      full_name: `Playwright ${prefix}`,
      is_superadmin: false,
      notification_preferences: {},
      phone: null,
      timezone: 'Europe/Rome',
      user_type: userType,
      work_mode: null,
    })
    .eq('id', userId)
  await assertNoSupabaseError('seed profile', profileError)

  const client = requireUserClient()
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  })
  await assertNoSupabaseError('sign in with password', signInError)

  return {
    userId,
    email,
    password,
    client,
    cleanup: async () => {
      try {
        await client.auth.signOut()
      } catch {
        // best effort
      }
      await service.auth.admin.deleteUser(userId)
    },
  }
}

test.describe('profiles RLS privileged updates', () => {
  test.skip(
    !hasSupabaseAuthEnv,
    'Requires Supabase URL, publishable key, and service-role env for direct RLS tests.'
  )

  test('normal authenticated user cannot change privileged fields but can edit harmless ones', async () => {
    const service = requireServiceClient()
    const fixture = await createAuthenticatedUserFixture(service, 'profiles-self-service', 'client')

    try {
      const { error: harmlessError, data: harmlessData } = await fixture.client
        .from('profiles')
        .update({
          avatar_url: 'https://example.com/avatar-safe.png',
          full_name: 'Updated Safe Name',
          notification_preferences: { push_prompted: true, push_accepted: true },
          phone: '+39 347 5550000',
        })
        .eq('id', fixture.userId)
        .select('full_name, avatar_url, notification_preferences, phone')
        .single()

      await assertNoSupabaseError('safe self-service profile update', harmlessError)
      expect(harmlessData?.full_name).toBe('Updated Safe Name')
      expect(harmlessData?.avatar_url).toBe('https://example.com/avatar-safe.png')
      expect(harmlessData?.phone).toBe('+39 347 5550000')
      expect(harmlessData?.notification_preferences).toMatchObject({
        push_prompted: true,
        push_accepted: true,
      })

      const { error: superadminError } = await fixture.client
        .from('profiles')
        .update({ is_superadmin: true })
        .eq('id', fixture.userId)
      expect(superadminError?.message).toContain(
        'Authenticated users cannot change privileged profile fields.'
      )

      const { error: adminRoleLikeError } = await fixture.client
        .from('profiles')
        .update({ user_type: 'admin' })
        .eq('id', fixture.userId)
      expect(adminRoleLikeError?.message).toContain(
        'Authenticated users cannot change privileged profile fields.'
      )

      const { error: roleColumnError } = await (fixture.client.from('profiles') as any)
        .update({ role: 'superadmin' })
        .eq('id', fixture.userId)
      expect(roleColumnError).toBeTruthy()

      const { error: tenantColumnError } = await (fixture.client.from('profiles') as any)
        .update({ tenant_id: randomUUID() })
        .eq('id', fixture.userId)
      expect(tenantColumnError).toBeTruthy()

      const { error: permissionsColumnError } = await (fixture.client.from('profiles') as any)
        .update({ permissions: ['*'] })
        .eq('id', fixture.userId)
      expect(permissionsColumnError).toBeTruthy()

      const { data: finalRow, error: finalRowError } = await service
        .from('profiles')
        .select('is_superadmin, user_type, full_name, avatar_url, notification_preferences, phone')
        .eq('id', fixture.userId)
        .single()
      await assertNoSupabaseError('read final profile row', finalRowError)

      expect(finalRow?.is_superadmin).toBe(false)
      expect(finalRow?.user_type).toBe('client')
      expect(finalRow?.full_name).toBe('Updated Safe Name')
      expect(finalRow?.avatar_url).toBe('https://example.com/avatar-safe.png')
      expect(finalRow?.phone).toBe('+39 347 5550000')
      expect(finalRow?.notification_preferences).toMatchObject({
        push_prompted: true,
        push_accepted: true,
      })
    } finally {
      await fixture.cleanup()
    }
  })

  test('privileged profile updates still work through the service-role admin path only', async () => {
    const service = requireServiceClient()
    const fixture = await createAuthenticatedUserFixture(service, 'profiles-admin-flow', 'client')

    try {
      const { data: promotedRow, error: promoteError } = await service
        .from('profiles')
        .update({
          is_superadmin: true,
          user_type: 'admin',
        })
        .eq('id', fixture.userId)
        .select('is_superadmin, user_type')
        .single()
      await assertNoSupabaseError('service-role privileged profile update', promoteError)

      expect(promotedRow?.is_superadmin).toBe(true)
      expect(promotedRow?.user_type).toBe('admin')

      const { error: directClientPrivilegedError } = await fixture.client
        .from('profiles')
        .update({ is_superadmin: false })
        .eq('id', fixture.userId)
      expect(directClientPrivilegedError?.message).toContain(
        'Authenticated users cannot change privileged profile fields.'
      )

      const { data: finalRow, error: finalRowError } = await service
        .from('profiles')
        .select('is_superadmin, user_type')
        .eq('id', fixture.userId)
        .single()
      await assertNoSupabaseError('read promoted profile row', finalRowError)

      expect(finalRow?.is_superadmin).toBe(true)
      expect(finalRow?.user_type).toBe('admin')
    } finally {
      await fixture.cleanup()
    }
  })
})
