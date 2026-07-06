import { randomBytes } from 'crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types'

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey =
  process.env.PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  ?? process.env.SUPABASE_SECRET_KEY

export const hasSupabaseSeedEnv = Boolean(supabaseUrl && serviceRoleKey)

export type ServiceClient = SupabaseClient<Database>

export interface TenantFixture {
  tenantId: string
  slug: string
  businessName: string
  cleanup: () => Promise<void>
}

export function randomSuffix(): string {
  return randomBytes(6).toString('hex')
}

export async function assertNoSupabaseError(
  label: string,
  error: { message: string } | null
): Promise<void> {
  if (!error) {
    return
  }

  throw new Error(`${label}: ${error.message}`)
}

export function requireServiceClient(): ServiceClient {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Playwright Supabase environment. Set PLAYWRIGHT_SUPABASE_URL and PLAYWRIGHT_SUPABASE_SERVICE_ROLE_KEY, or reuse NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.'
    )
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function createTenantFixture(prefix: string = 'playwright-e2e'): Promise<TenantFixture> {
  const supabase = requireServiceClient()
  const suffix = randomSuffix()
  const slug = `${prefix}-${suffix}`.toLowerCase()
  const businessName = `Playwright ${prefix} ${suffix}`

  const { data, error } = await supabase
    .from('tenants')
    .insert({
      business_name: businessName,
      primary_color: '#111111',
      settings: {},
      slug,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()

  await assertNoSupabaseError('create tenant fixture', error)

  const tenantId = data?.id
  if (!tenantId) {
    throw new Error('create tenant fixture: missing tenant id')
  }

  return {
    tenantId,
    slug,
    businessName,
    cleanup: async () => {
      await supabase.from('tenants').delete().eq('id', tenantId)
    },
  }
}
