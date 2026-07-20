import { randomBytes } from 'crypto'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test } from 'playwright/test'
import type { Database } from '../src/types'
import {
  assertNoSupabaseError,
  createTenantFixture,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

const repoRoot = path.join(process.cwd(), '..', '..')
const matrixPath = path.join(repoRoot, 'docs', 'legal', 'data-retention-matrix.md')
const retentionMigrationPath = path.join(
  repoRoot,
  'supabase',
  'migrations',
  '20260711140000_data_retention_f15.sql',
)

const supabaseUrl =
  process.env.PLAYWRIGHT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey =
  process.env.PLAYWRIGHT_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const hasSupabaseRpcEnv = Boolean(supabaseUrl && publishableKey && hasSupabaseSeedEnv)

type UserClient = SupabaseClient<Database>

type MissingTablesDb = {
  from(table: 'site_sessions'): {
    insert(data: Record<string, unknown> | Record<string, unknown>[]): {
      select(columns: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
  }
  from(table: 'site_events'): {
    insert(data: Record<string, unknown> | Record<string, unknown>[]): Promise<{ error: { message: string } | null }>
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
  }
  from(table: 'platform_leads'): {
    insert(data: Record<string, unknown> | Record<string, unknown>[]): {
      select(columns: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>
      }
    }
  }
  from(table: 'onboarding_tokens'): {
    insert(data: Record<string, unknown> | Record<string, unknown>[]): {
      select(columns: string): {
        single(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
    select(columns: string): {
      eq(column: string, value: string): {
        maybeSingle(): Promise<{ data: { id: string } | null; error: { message: string } | null }>
      }
    }
  }
}

interface AuthFixture {
  userId: string
  client: UserClient
  cleanup: () => Promise<void>
}

function readMarkdown(filePath: string): string {
  return readFileSync(filePath, 'utf8')
}

function normalizeAnchor(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[`*_~]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function extractAnchors(markdown: string): Set<string> {
  const anchors = new Set<string>()

  for (const line of markdown.split('\n')) {
    const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim())
    if (!match) continue
    anchors.add(normalizeAnchor(match[2].replace(/\s+#*$/, '')))
  }

  return anchors
}

function extractMarkdownLinks(markdown: string): string[] {
  const links: string[] = []
  const regex = /\[[^\]]+\]\(([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(markdown)) !== null) {
    links.push(match[1].trim())
  }

  return links
}

function assertLocalLinkResolves(sourceFile: string, rawLink: string) {
  const link = rawLink.replace(/^<|>$/g, '')
  if (
    link.startsWith('http://') ||
    link.startsWith('https://') ||
    link.startsWith('mailto:') ||
    link.startsWith('tel:')
  ) {
    return
  }

  const hashIndex = link.indexOf('#')
  const fileRef = hashIndex >= 0 ? link.slice(0, hashIndex) : link
  const anchorRef = hashIndex >= 0 ? decodeURIComponent(link.slice(hashIndex + 1)) : ''
  const targetFile = fileRef ? path.resolve(path.dirname(sourceFile), fileRef) : sourceFile

  expect(existsSync(targetFile), `${path.relative(repoRoot, sourceFile)} -> ${link}`).toBe(true)

  if (anchorRef) {
    const anchors = extractAnchors(readMarkdown(targetFile))
    expect(anchors.has(normalizeAnchor(anchorRef)), `${path.relative(repoRoot, sourceFile)} -> ${link}`).toBe(true)
  }
}

function requireUserClient(): UserClient {
  if (!supabaseUrl || !publishableKey) {
    throw new Error('Missing publishable Supabase env for retention RPC tests.')
  }

  return createClient<Database>(supabaseUrl, publishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function createAuthenticatedRpcFixture(service: ServiceClient): Promise<AuthFixture> {
  const suffix = randomSuffix()
  const email = `retention-rpc-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')

  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError('create retention rpc auth user', authError)

  const userId = authData.user?.id
  if (!userId) {
    throw new Error('create retention rpc auth user: missing id')
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({
      email,
      email_verified: true,
      full_name: `Retention RPC ${suffix}`,
      user_type: 'staff',
    })
    .eq('id', userId)
  await assertNoSupabaseError('seed retention rpc profile', profileError)

  const client = requireUserClient()
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  await assertNoSupabaseError('sign in retention rpc user', signInError)

  return {
    userId,
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

test.describe.serial('data retention matrix', () => {
  test('matrix exists, covers the censused personal tables, and has no broken local links', async () => {
    expect(existsSync(matrixPath)).toBe(true)

    const markdown = readMarkdown(matrixPath)
    const requiredTables = [
      'tenants',
      'locations',
      'profiles',
      'staff_members',
      'team_invitations',
      'onboarding_tokens',
      'platform_leads',
      'admin_audit_log',
      'platform_notifications',
      'clients',
      'client_notes',
      'appointments',
      'appointment_services',
      'appointment_products',
      'payments',
      'client_product_wishlist',
      'client_loyalty',
      'loyalty_transactions',
      'reward_redemptions',
      'client_analytics',
      'client_badges',
      'consent_events',
      'client_privacy_requests',
      'analytics_consent_events',
      'marketing_unsubscribe_tokens',
      'email_verification_tokens',
      'push_subscriptions',
      'notifications',
      'notification_log',
      'site_sessions',
      'site_events',
      'client_import_jobs',
    ]

    for (const tableName of requiredTables) {
      expect(markdown).toContain(`\`${tableName}\``)
    }

    for (const link of extractMarkdownLinks(markdown)) {
      assertLocalLinkResolves(matrixPath, link)
    }
  })

  test.skip(!hasSupabaseRpcEnv, 'Requires Supabase URL, publishable key, and service-role env for retention RPC tests.')

  test('service role can run retention cleanup, client/anon cannot, and old rows are cleaned while recent rows survive', async () => {
    const service = requireServiceClient()
    const rawDb = service as unknown as MissingTablesDb
    const tenant = await createTenantFixture('retention-matrix')
    const authFixture = await createAuthenticatedRpcFixture(service)
    const now = new Date()
    const recent = now.toISOString()
    const old90 = new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000).toISOString()
    const old180 = new Date(now.getTime() - 185 * 24 * 60 * 60 * 1000).toISOString()
    const old365 = new Date(now.getTime() - 370 * 24 * 60 * 60 * 1000).toISOString()
    const future = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString()

    try {
      const { data: oldSession, error: oldSessionError } = await rawDb
        .from('site_sessions')
        .insert({
          tenant_id: tenant.tenantId,
          anonymous_id: `old-anon-${randomSuffix()}`,
          last_seen_at: old90,
          first_seen_at: old90,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old site session', oldSessionError)

      const { data: recentSession, error: recentSessionError } = await rawDb
        .from('site_sessions')
        .insert({
          tenant_id: tenant.tenantId,
          anonymous_id: `recent-anon-${randomSuffix()}`,
          last_seen_at: recent,
          first_seen_at: recent,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent site session', recentSessionError)

      const { data: oldImportJob, error: oldImportJobError } = await service
        .from('client_import_jobs')
        .insert({
          tenant_id: tenant.tenantId,
          source: 'csv_generic',
          filename: 'old.csv',
          created_at: old90,
          status: 'completed',
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old import job', oldImportJobError)

      const { data: recentImportJob, error: recentImportJobError } = await service
        .from('client_import_jobs')
        .insert({
          tenant_id: tenant.tenantId,
          source: 'csv_generic',
          filename: 'recent.csv',
          created_at: recent,
          status: 'completed',
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent import job', recentImportJobError)

      const { data: oldNotificationLog, error: oldNotificationLogError } = await service
        .from('notification_log')
        .insert({
          tenant_id: tenant.tenantId,
          type: 'campaign',
          sent_at: old90,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old notification log', oldNotificationLogError)

      const { data: recentNotificationLog, error: recentNotificationLogError } = await service
        .from('notification_log')
        .insert({
          tenant_id: tenant.tenantId,
          type: 'campaign',
          sent_at: recent,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent notification log', recentNotificationLogError)

      const { data: oldNotification, error: oldNotificationError } = await service
        .from('notifications')
        .insert({
          tenant_id: tenant.tenantId,
          title: 'Old notification',
          type: 'campaign',
          created_at: old180,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old notification', oldNotificationError)

      const { data: recentNotification, error: recentNotificationError } = await service
        .from('notifications')
        .insert({
          tenant_id: tenant.tenantId,
          title: 'Recent notification',
          type: 'campaign',
          created_at: recent,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent notification', recentNotificationError)

      const { data: oldPlatformNotification, error: oldPlatformNotificationError } = await service
        .from('platform_notifications')
        .insert({
          title: 'Old platform notification',
          type: 'tenant_created',
          created_at: old180,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old platform notification', oldPlatformNotificationError)

      const { data: recentPlatformNotification, error: recentPlatformNotificationError } = await service
        .from('platform_notifications')
        .insert({
          title: 'Recent platform notification',
          type: 'tenant_created',
          created_at: recent,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent platform notification', recentPlatformNotificationError)

      const { data: oldInvitation, error: oldInvitationError } = await service
        .from('team_invitations')
        .insert({
          tenant_id: tenant.tenantId,
          email: `old-invite-${randomSuffix()}@example.com`,
          token: randomBytes(32).toString('hex'),
          role: 'staff',
          created_by: authFixture.userId,
          created_at: old90,
          expires_at: old90,
          accepted_at: old90,
          status: 'accepted',
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old invitation', oldInvitationError)

      const { data: recentInvitation, error: recentInvitationError } = await service
        .from('team_invitations')
        .insert({
          tenant_id: tenant.tenantId,
          email: `recent-invite-${randomSuffix()}@example.com`,
          token: randomBytes(32).toString('hex'),
          role: 'staff',
          created_by: authFixture.userId,
          created_at: recent,
          expires_at: future,
          status: 'pending',
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent invitation', recentInvitationError)

      const { data: oldOnboardingToken, error: oldOnboardingTokenError } = await rawDb
        .from('onboarding_tokens')
        .insert({
          token: randomBytes(16).toString('hex'),
          barbiere_email: `old-onboarding-${randomSuffix()}@example.com`,
          created_by: authFixture.userId,
          created_at: old90,
          expires_at: old90,
          used_at: old90,
          used_by_email: `used-${randomSuffix()}@example.com`,
          active: false,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert old onboarding token', oldOnboardingTokenError)

      const { data: recentOnboardingToken, error: recentOnboardingTokenError } = await rawDb
        .from('onboarding_tokens')
        .insert({
          token: randomBytes(16).toString('hex'),
          barbiere_email: `recent-onboarding-${randomSuffix()}@example.com`,
          created_by: authFixture.userId,
          created_at: recent,
          expires_at: future,
          active: true,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent onboarding token', recentOnboardingTokenError)

      const { data: staleLead, error: staleLeadError } = await rawDb
        .from('platform_leads')
        .insert({
          email: `stale-lead-${randomSuffix()}@example.com`,
          phone: '+39 333 700 0001',
          business_name: 'Stale Lead Srl',
          source: 'trial_signup',
          consent_marketing: false,
          status: 'lost',
          created_at: old365,
          updated_at: old365,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert stale platform lead', staleLeadError)

      const { data: convertedLead, error: convertedLeadError } = await rawDb
        .from('platform_leads')
        .insert({
          email: `converted-lead-${randomSuffix()}@example.com`,
          phone: '+39 333 700 0002',
          business_name: 'Converted Lead Srl',
          source: 'demo_request',
          consent_marketing: true,
          consent_at: old90,
          status: 'converted',
          converted_tenant_id: tenant.tenantId,
          created_at: old90,
          updated_at: old90,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert converted platform lead', convertedLeadError)

      const { data: recentLead, error: recentLeadError } = await rawDb
        .from('platform_leads')
        .insert({
          email: `recent-lead-${randomSuffix()}@example.com`,
          phone: '+39 333 700 0003',
          business_name: 'Recent Lead Srl',
          source: 'trial_signup',
          consent_marketing: true,
          consent_at: recent,
          status: 'new',
          created_at: recent,
          updated_at: recent,
        })
        .select('id')
        .single()
      await assertNoSupabaseError('insert recent platform lead', recentLeadError)

      const { data: oldLeadSnapshot, error: oldLeadSnapshotError } = await service.rpc(
        'run_data_retention_cleanup',
      )
      await assertNoSupabaseError('run data retention cleanup as service role', oldLeadSnapshotError)
      expect(oldLeadSnapshot).toBeTruthy()

      const { error: anonError } = await requireUserClient().rpc('run_data_retention_cleanup')
      expect(anonError).toBeTruthy()

      const { error: authenticatedError } = await authFixture.client.rpc('run_data_retention_cleanup')
      expect(authenticatedError).toBeTruthy()

      const { data: oldSessionAfter } = await rawDb
        .from('site_sessions')
        .select('id')
        .eq('id', oldSession!.id)
        .maybeSingle()
      const { data: recentSessionAfter } = await rawDb
        .from('site_sessions')
        .select('id')
        .eq('id', recentSession!.id)
        .maybeSingle()

      expect(oldSessionAfter).toBeNull()
      expect(recentSessionAfter?.id).toBe(recentSession!.id)

      const { data: oldImportAfter } = await service
        .from('client_import_jobs')
        .select('id')
        .eq('id', oldImportJob!.id)
        .maybeSingle()
      const { data: recentImportAfter } = await service
        .from('client_import_jobs')
        .select('id')
        .eq('id', recentImportJob!.id)
        .maybeSingle()
      expect(oldImportAfter).toBeNull()
      expect(recentImportAfter?.id).toBe(recentImportJob!.id)

      const { data: oldNotificationLogAfter } = await service
        .from('notification_log')
        .select('id')
        .eq('id', oldNotificationLog!.id)
        .maybeSingle()
      const { data: recentNotificationLogAfter } = await service
        .from('notification_log')
        .select('id')
        .eq('id', recentNotificationLog!.id)
        .maybeSingle()
      expect(oldNotificationLogAfter).toBeNull()
      expect(recentNotificationLogAfter?.id).toBe(recentNotificationLog!.id)

      const { data: oldNotificationAfter } = await service
        .from('notifications')
        .select('id')
        .eq('id', oldNotification!.id)
        .maybeSingle()
      const { data: recentNotificationAfter } = await service
        .from('notifications')
        .select('id')
        .eq('id', recentNotification!.id)
        .maybeSingle()
      expect(oldNotificationAfter).toBeNull()
      expect(recentNotificationAfter?.id).toBe(recentNotification!.id)

      const { data: oldPlatformNotificationAfter } = await service
        .from('platform_notifications')
        .select('id')
        .eq('id', oldPlatformNotification!.id)
        .maybeSingle()
      const { data: recentPlatformNotificationAfter } = await service
        .from('platform_notifications')
        .select('id')
        .eq('id', recentPlatformNotification!.id)
        .maybeSingle()
      expect(oldPlatformNotificationAfter).toBeNull()
      expect(recentPlatformNotificationAfter?.id).toBe(recentPlatformNotification!.id)

      const { data: oldInvitationAfter } = await service
        .from('team_invitations')
        .select('id')
        .eq('id', oldInvitation!.id)
        .maybeSingle()
      const { data: recentInvitationAfter } = await service
        .from('team_invitations')
        .select('id')
        .eq('id', recentInvitation!.id)
        .maybeSingle()
      expect(oldInvitationAfter).toBeNull()
      expect(recentInvitationAfter?.id).toBe(recentInvitation!.id)

      const { data: oldOnboardingAfter } = await rawDb
        .from('onboarding_tokens')
        .select('id')
        .eq('id', oldOnboardingToken!.id)
        .maybeSingle()
      const { data: recentOnboardingAfter } = await rawDb
        .from('onboarding_tokens')
        .select('id')
        .eq('id', recentOnboardingToken!.id)
        .maybeSingle()
      expect(oldOnboardingAfter).toBeNull()
      expect(recentOnboardingAfter?.id).toBe(recentOnboardingToken!.id)

      const { data: staleLeadAfter } = await rawDb
        .from('platform_leads')
        .select('id, email, phone, business_name, consent_marketing, consent_at')
        .eq('id', staleLead!.id)
        .maybeSingle()
      const { data: convertedLeadAfter } = await rawDb
        .from('platform_leads')
        .select('id, email, phone, business_name, consent_marketing, consent_at')
        .eq('id', convertedLead!.id)
        .maybeSingle()
      const { data: recentLeadAfter } = await rawDb
        .from('platform_leads')
        .select('id, email, phone, business_name, consent_marketing, consent_at')
        .eq('id', recentLead!.id)
        .maybeSingle()

      expect(staleLeadAfter).toBeNull()
      expect(convertedLeadAfter?.id).toBe(convertedLead!.id)
      expect(String(convertedLeadAfter?.email ?? '')).toContain(`deleted+${convertedLead!.id}`)
      expect(convertedLeadAfter?.phone).toBeNull()
      expect(convertedLeadAfter?.business_name).toBeNull()
      expect(convertedLeadAfter?.consent_marketing).toBe(false)
      expect(convertedLeadAfter?.consent_at).toBeNull()
      expect(recentLeadAfter?.id).toBe(recentLead!.id)
    } finally {
      await authFixture.cleanup()
      await tenant.cleanup()
    }
  })

  test('retention migration schedules the master cleanup cron and references the expected functions', async () => {
    expect(existsSync(retentionMigrationPath)).toBe(true)
    const migrationSql = readMarkdown(retentionMigrationPath)

    expect(migrationSql).toContain("cron.schedule(")
    expect(migrationSql).toContain("'run_data_retention_cleanup'")
    expect(migrationSql).toContain('SELECT public.run_data_retention_cleanup()')
    expect(migrationSql).toContain('cleanup_old_site_sessions')
    expect(migrationSql).toContain('cleanup_old_client_import_jobs')
    expect(migrationSql).toContain('cleanup_old_notification_log')
    expect(migrationSql).toContain('cleanup_expired_team_invitations')
    expect(migrationSql).toContain('cleanup_old_onboarding_tokens')
    expect(migrationSql).toContain('cleanup_platform_leads_retention')
  })
})
