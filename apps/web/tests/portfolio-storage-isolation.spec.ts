import { randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'
import type { Database } from '../src/types'
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

const hasSupabaseStorageEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)
const PORTFOLIO_BUCKET = 'portfolio'

type UserClient = SupabaseClient<Database>

interface StaffUserFixture {
  userId: string
  email: string
  password: string
  client: UserClient
}

interface TenantStaffResource {
  tenantId: string
  staffId: string
}

interface PortfolioFixture {
  actor: StaffUserFixture
  tenantA: TenantStaffResource
  tenantB: { tenantId: string }
  trackUploadedPaths: (...paths: string[]) => void
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

function buildTenantScopedPortfolioPath(tenantId: string, suffix: string): string {
  return `tenants/${tenantId}/${suffix}.webp`
}

async function createStaffUserFixture(service: ServiceClient, suffix: string): Promise<StaffUserFixture> {
  const email = `playwright-portfolio-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError('create auth user', authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error('create auth user: missing user id')
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Playwright Portfolio ${suffix}`,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError('seed staff profile', profileError)

  const client = requireUserClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  await assertNoSupabaseError('sign in staff user', signInError)

  return { userId, email, password, client }
}

async function createTenant(service: ServiceClient, suffix: string, index: number): Promise<string> {
  const { data, error } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Portfolio ${suffix} ${index}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-portfolio-${suffix}-${index}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant', error)

  if (!data?.id) {
    throw new Error('create tenant: missing tenant id')
  }

  return data.id
}

async function createTenantStaff(
  service: ServiceClient,
  tenantId: string,
  profileId: string
): Promise<TenantStaffResource> {
  const { data, error } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: profileId,
      role: 'owner',
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create staff member', error)

  if (!data?.id) {
    throw new Error('create staff member: missing staff id')
  }

  return {
    tenantId,
    staffId: data.id,
  }
}

async function seedPortfolioFixture(): Promise<PortfolioFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const tenantIds: string[] = []
  const staffIds: string[] = []
  const uploadedPaths: string[] = []

  const actor = await createStaffUserFixture(service, suffix)

  const tenantAId = await createTenant(service, suffix, 1)
  const tenantBId = await createTenant(service, suffix, 2)
  tenantIds.push(tenantAId, tenantBId)

  const tenantA = await createTenantStaff(service, tenantAId, actor.userId)
  staffIds.push(tenantA.staffId)

  return {
    actor,
    tenantA,
    tenantB: { tenantId: tenantBId },
    trackUploadedPaths: (...paths: string[]) => {
      uploadedPaths.push(...paths)
    },
    cleanup: async () => {
      try {
        await actor.client.auth.signOut()
      } catch {
        // best effort
      }

      if (uploadedPaths.length > 0) {
        await service.storage.from(PORTFOLIO_BUCKET).remove(uploadedPaths)
      }

      if (staffIds.length > 0) {
        await service.from('staff_members').delete().in('id', staffIds)
      }

      if (tenantIds.length > 0) {
        await service.from('tenants').delete().in('id', tenantIds)
      }

      await service.auth.admin.deleteUser(actor.userId)
    },
  }
}

test.describe('portfolio storage tenant isolation', () => {
  test.skip(
    !hasSupabaseStorageEnv,
    'Requires Supabase URL, publishable key, and service-role env for storage isolation tests.'
  )

  test('tenant-scoped portfolio storage blocks cross-tenant upload, overwrite, delete, and read', async () => {
    const fixture = await seedPortfolioFixture()
    const service = requireServiceClient()

    const ownPath = buildTenantScopedPortfolioPath(fixture.tenantA.tenantId, `own-${randomSuffix()}`)
    const otherPath = buildTenantScopedPortfolioPath(fixture.tenantB.tenantId, `other-${randomSuffix()}`)
    const ownBytes = Buffer.from('own-portfolio-asset')
    const otherBytes = Buffer.from('other-portfolio-asset')

    try {
      const { error: ownUploadError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .upload(ownPath, ownBytes, {
          contentType: 'image/webp',
          upsert: false,
        })
      await assertNoSupabaseError('upload own tenant portfolio asset', ownUploadError)

      const { data: ownDownload, error: ownDownloadError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .download(ownPath)
      await assertNoSupabaseError('download own tenant portfolio asset', ownDownloadError)
      expect(ownDownload).toBeTruthy()

      const { error: crossTenantUploadError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .upload(otherPath, Buffer.from('cross-tenant-attempt'), {
          contentType: 'image/webp',
          upsert: false,
        })
      expect(crossTenantUploadError).toBeTruthy()

      const { error: seedOtherError } = await service.storage
        .from(PORTFOLIO_BUCKET)
        .upload(otherPath, otherBytes, {
          contentType: 'image/webp',
          upsert: false,
        })
      await assertNoSupabaseError('seed other tenant portfolio asset', seedOtherError)

      const { error: crossTenantUpdateError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .update(otherPath, Buffer.from('overwrite-attempt'), {
          contentType: 'image/webp',
        })
      expect(crossTenantUpdateError).toBeTruthy()

      const { data: afterUpdateDownload, error: afterUpdateDownloadError } = await service.storage
        .from(PORTFOLIO_BUCKET)
        .download(otherPath)
      await assertNoSupabaseError(
        'download other tenant portfolio asset after failed update',
        afterUpdateDownloadError
      )
      expect(await afterUpdateDownload!.text()).toBe('other-portfolio-asset')

      const { error: crossTenantDeleteError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .remove([otherPath])
      if (crossTenantDeleteError) {
        expect(crossTenantDeleteError).toBeTruthy()
      }

      const { data: afterDeleteDownload, error: afterDeleteDownloadError } = await service.storage
        .from(PORTFOLIO_BUCKET)
        .download(otherPath)
      await assertNoSupabaseError(
        'download other tenant portfolio asset after failed delete',
        afterDeleteDownloadError
      )
      expect(await afterDeleteDownload!.text()).toBe('other-portfolio-asset')

      const { data: crossTenantDownload, error: crossTenantDownloadError } = await fixture.actor.client.storage
        .from(PORTFOLIO_BUCKET)
        .download(otherPath)
      expect(crossTenantDownload).toBeFalsy()
      expect(crossTenantDownloadError).toBeTruthy()

      const { data: signed, error: signedError } = await service.storage
        .from(PORTFOLIO_BUCKET)
        .createSignedUrl(ownPath, 60)
      await assertNoSupabaseError('create signed portfolio url', signedError)
      expect(signed?.signedUrl).toBeTruthy()

      const signedResponse = await fetch(signed!.signedUrl)
      expect(signedResponse.status).toBe(200)

      const { data: publicUrlData } = service.storage
        .from(PORTFOLIO_BUCKET)
        .getPublicUrl(ownPath)
      const publicResponse = await fetch(publicUrlData.publicUrl)
      expect(publicResponse.status).not.toBe(200)

      fixture.trackUploadedPaths(ownPath, otherPath)
    } finally {
      await fixture.cleanup()
    }
  })
})
