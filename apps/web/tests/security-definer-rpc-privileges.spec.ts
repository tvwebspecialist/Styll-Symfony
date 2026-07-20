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

const hasSupabaseRpcEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)

type UserClient = SupabaseClient<Database>

interface StaffUserFixture {
  userId: string
  email: string
  password: string
  client: UserClient
}

interface TenantInventoryResource {
  tenantId: string
  locationId: string
  productId: string
  inventoryId: string
}

interface RpcFixture {
  actor: StaffUserFixture
  tenantA: TenantInventoryResource
  tenantB: TenantInventoryResource
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

async function createStaffUserFixture(service: ServiceClient, suffix: string): Promise<StaffUserFixture> {
  const email = `playwright-rpc-${suffix}@example.com`
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
      full_name: `Playwright RPC ${suffix}`,
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
      business_name: `Playwright RPC ${suffix} ${index}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-rpc-${suffix}-${index}`,
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

async function createTenantInventoryResource(
  service: ServiceClient,
  tenantId: string
): Promise<TenantInventoryResource> {
  const { data: location, error: locationError } = await service
    .from('locations')
    .insert({
      is_active: true,
      name: `RPC Location ${tenantId.slice(0, 8)}`,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create location', locationError)

  const locationId = location?.id
  if (!locationId) {
    throw new Error('create location: missing location id')
  }

  const { data: product, error: productError } = await service
    .from('products')
    .insert({
      is_active: true,
      name: `RPC Product ${tenantId.slice(0, 8)}`,
      price_sell: 19,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create product', productError)

  const productId = product?.id
  if (!productId) {
    throw new Error('create product: missing product id')
  }

  const { data: inventory, error: inventoryError } = await service
    .from('product_inventory')
    .insert({
      location_id: locationId,
      low_stock_threshold: 0,
      product_id: productId,
      quantity: 10,
      tenant_id: tenantId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create inventory', inventoryError)

  const inventoryId = inventory?.id
  if (!inventoryId) {
    throw new Error('create inventory: missing inventory id')
  }

  return { tenantId, locationId, productId, inventoryId }
}

async function seedRpcFixture(): Promise<RpcFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const tenantIds: string[] = []
  const locationIds: string[] = []
  const productIds: string[] = []
  const inventoryIds: string[] = []
  const staffIds: string[] = []

  const actor = await createStaffUserFixture(service, suffix)
  const tenantAId = await createTenant(service, suffix, 1)
  const tenantBId = await createTenant(service, suffix, 2)
  tenantIds.push(tenantAId, tenantBId)

  const { data: staffA, error: staffAError } = await service
    .from('staff_members')
    .insert({
      is_active: true,
      profile_id: actor.userId,
      role: 'owner',
      tenant_id: tenantAId,
    })
    .select('id')
    .single()
  await assertNoSupabaseError('create tenant A owner membership', staffAError)
  if (staffA?.id) {
    staffIds.push(staffA.id)
  }

  const tenantA = await createTenantInventoryResource(service, tenantAId)
  const tenantB = await createTenantInventoryResource(service, tenantBId)
  locationIds.push(tenantA.locationId, tenantB.locationId)
  productIds.push(tenantA.productId, tenantB.productId)
  inventoryIds.push(tenantA.inventoryId, tenantB.inventoryId)

  return {
    actor,
    tenantA,
    tenantB,
    cleanup: async () => {
      try {
        await actor.client.auth.signOut()
      } catch {
        // best effort
      }

      if (inventoryIds.length > 0) {
        await service.from('product_inventory').delete().in('id', inventoryIds)
      }
      if (productIds.length > 0) {
        await service.from('products').delete().in('id', productIds)
      }
      if (locationIds.length > 0) {
        await service.from('locations').delete().in('id', locationIds)
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

test.describe('SECURITY DEFINER RPC privilege hardening', () => {
  test.skip(
    !hasSupabaseRpcEnv,
    'Requires Supabase URL, publishable key, and service-role env for RPC privilege tests.'
  )

  test('anon and authenticated callers cannot execute sensitive RPCs, while intended helper/admin flows still work', async () => {
    const fixture = await seedRpcFixture()
    const service = requireServiceClient()
    const anon = requireUserClient()

    try {
      const { data: helperTenantId, error: helperTenantError } = await fixture.actor.client.rpc('get_my_tenant_id')
      await assertNoSupabaseError('authenticated get_my_tenant_id', helperTenantError)
      expect(helperTenantId).toBe(fixture.tenantA.tenantId)

      const { data: currentTenantId, error: currentTenantError } = await fixture.actor.client.rpc('current_tenant_id')
      await assertNoSupabaseError('authenticated current_tenant_id', currentTenantError)
      expect(currentTenantId).toBe(fixture.tenantA.tenantId)

      const { data: isSuperadmin, error: isSuperadminError } = await fixture.actor.client.rpc('is_superadmin')
      await assertNoSupabaseError('authenticated is_superadmin', isSuperadminError)
      expect(isSuperadmin).toBe(false)

      const { error: anonSensitiveError } = await anon.rpc('decrement_product_inventory', {
        p_tenant_id: fixture.tenantA.tenantId,
        p_product_id: fixture.tenantA.productId,
        p_location_id: fixture.tenantA.locationId,
        p_quantity: 1,
      })
      expect(anonSensitiveError).toBeTruthy()

      const { error: authenticatedAdminError } = await fixture.actor.client.rpc(
        'recompute_all_client_analytics'
      )
      expect(authenticatedAdminError).toBeTruthy()

      const { error: authenticatedTenantRecomputeError } = await fixture.actor.client.rpc(
        'recompute_tenant_client_analytics',
        { p_tenant_id: fixture.tenantA.tenantId }
      )
      expect(authenticatedTenantRecomputeError).toBeTruthy()

      const { error: authenticatedOwnTenantError } = await fixture.actor.client.rpc(
        'decrement_product_inventory',
        {
          p_tenant_id: fixture.tenantA.tenantId,
          p_product_id: fixture.tenantA.productId,
          p_location_id: fixture.tenantA.locationId,
          p_quantity: 1,
        }
      )
      expect(authenticatedOwnTenantError).toBeTruthy()

      const { error: authenticatedCrossTenantError } = await fixture.actor.client.rpc(
        'decrement_product_inventory',
        {
          p_tenant_id: fixture.tenantB.tenantId,
          p_product_id: fixture.tenantB.productId,
          p_location_id: fixture.tenantB.locationId,
          p_quantity: 1,
        }
      )
      expect(authenticatedCrossTenantError).toBeTruthy()

      const { error: sensitiveHelperAnonError } = await anon.rpc('get_my_tenant_id')
      expect(sensitiveHelperAnonError).toBeTruthy()

      const { error: serviceRoleDecrementError } = await service.rpc('decrement_product_inventory', {
        p_tenant_id: fixture.tenantA.tenantId,
        p_product_id: fixture.tenantA.productId,
        p_location_id: fixture.tenantA.locationId,
        p_quantity: 2,
      })
      await assertNoSupabaseError('service-role decrement_product_inventory', serviceRoleDecrementError)

      const { data: inventoryAfter, error: inventoryAfterError } = await service
        .from('product_inventory')
        .select('quantity')
        .eq('id', fixture.tenantA.inventoryId)
        .single()
      await assertNoSupabaseError('read inventory after service decrement', inventoryAfterError)
      expect(inventoryAfter?.quantity).toBe(8)

      const { data: recomputeResult, error: serviceRoleRecomputeError } = await service.rpc(
        'recompute_all_client_analytics'
      )
      await assertNoSupabaseError('service-role recompute_all_client_analytics', serviceRoleRecomputeError)
      expect(typeof recomputeResult).toBe('number')

      const { data: tenantRecomputeResult, error: serviceRoleTenantRecomputeError } = await service.rpc(
        'recompute_tenant_client_analytics',
        { p_tenant_id: fixture.tenantA.tenantId }
      )
      await assertNoSupabaseError('service-role recompute_tenant_client_analytics', serviceRoleTenantRecomputeError)
      expect(typeof tenantRecomputeResult).toBe('number')
    } finally {
      await fixture.cleanup()
    }
  })
})
