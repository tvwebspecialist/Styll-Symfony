import { randomBytes } from 'crypto'
import { expect, test } from 'playwright/test'
import {
  CLIENT_IMPORT_FALLBACK_LOOKUP_CHUNK_SIZE,
  fetchClientImportDuplicateCandidates,
  importClientsForTenant,
} from '../src/lib/actions/clienti'
import type { Json } from '../src/types'
import {
  collectImportLookupKeys,
  prepareClientImportPlan,
  type ImportColumn,
  type ImportRow,
} from '../src/lib/utils/client-import-core'
import {
  assertNoSupabaseError,
  hasSupabaseSeedEnv,
  randomSuffix,
  requireServiceClient,
  type ServiceClient,
} from './helpers/supabase-admin'

interface ImportFixture {
  initiatedBy: string
  service: ServiceClient
  tenantAId: string
  tenantBId: string
  cleanup: () => Promise<void>
}

interface LookupCall {
  column: 'email' | 'phone'
  values: string[]
}

interface JobRow {
  error_count: number
  id: string
  imported_count: number
  merged_count: number
  skipped_count: number
  status: string
  total_rows: number
}

function readTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string')
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return readTags(parsed)
    } catch {
      return []
    }
  }

  return []
}

function buildCsvMapping(): Record<string, ImportColumn> {
  return {
    Name: 'full_name',
    Email: 'email',
    Phone: 'phone',
    Tags: 'tags',
    Marketing: 'marketing_consent',
  }
}

function createLookupMockDb(calls: LookupCall[]) {
  return {
    rpc: async () => ({
      data: null,
      error: {
        message: 'Could not find the function public.get_client_import_candidates(p_tenant_id, p_emails, p_phones) in the schema cache',
      },
    }),
    from(table: string) {
      expect(table).toBe('clients')

      return {
        select(selectClause: string) {
          expect(selectClause).toContain('id, full_name, email, phone')

          return {
            eq() {
              return this
            },
            is() {
              return this
            },
            in(column: 'email' | 'phone', values: string[]) {
              calls.push({ column, values })
              return Promise.resolve({ data: [], error: null })
            },
          }
        },
      }
    },
  } as unknown as Parameters<typeof fetchClientImportDuplicateCandidates>[0]
}

async function createInitiatedByUser(
  service: ServiceClient,
  suffix: string,
): Promise<string> {
  const email = `playwright-client-import-${suffix}@example.com`
  const password = randomBytes(18).toString('hex')
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { user_type: 'staff' },
  })
  await assertNoSupabaseError('create import initiated_by user', error)

  const userId = data.user?.id
  if (!userId) {
    throw new Error('create import initiated_by user: missing id')
  }

  return userId
}

async function createTenant(
  service: ServiceClient,
  suffix: string,
  label: 'a' | 'b',
): Promise<string> {
  const { data, error } = await service
    .from('tenants')
    .insert({
      business_name: `Playwright Client Import ${label.toUpperCase()} ${suffix}`,
      primary_color: '#111111',
      settings: {},
      slug: `pw-client-import-${label}-${suffix}`,
      status: 'active',
      timezone: 'Europe/Rome',
    })
    .select('id')
    .single()
  await assertNoSupabaseError(`create import tenant ${label}`, error)

  const tenantId = data?.id
  if (!tenantId) {
    throw new Error(`create import tenant ${label}: missing id`)
  }

  return tenantId
}

async function createImportFixture(): Promise<ImportFixture> {
  const service = requireServiceClient()
  const suffix = randomSuffix()
  const initiatedBy = await createInitiatedByUser(service, suffix)
  const tenantAId = await createTenant(service, suffix, 'a')
  const tenantBId = await createTenant(service, suffix, 'b')

  return {
    initiatedBy,
    service,
    tenantAId,
    tenantBId,
    cleanup: async () => {
      await service.from('client_import_jobs').delete().in('tenant_id', [tenantAId, tenantBId])
      await service.from('clients').delete().in('tenant_id', [tenantAId, tenantBId])
      await service.from('tenants').delete().in('id', [tenantAId, tenantBId])
      await service.auth.admin.deleteUser(initiatedBy)
    },
  }
}

async function insertClients(
  service: ServiceClient,
  rows: Array<{
    tenant_id: string
    full_name: string
    email?: string | null
    phone?: string | null
    marketing_consent?: boolean
    tags?: Json | null
  }>,
) {
  const { data, error } = await service
    .from('clients')
    .insert(rows.map((row) => ({
      tenant_id: row.tenant_id,
      full_name: row.full_name,
      email: row.email ?? null,
      phone: row.phone ?? null,
      marketing_consent: row.marketing_consent ?? false,
      preferred_contact_channel: 'whatsapp',
      tags: row.tags ?? [],
    })))
    .select('id, tenant_id, full_name, email, phone, marketing_consent, tags')
  await assertNoSupabaseError('insert import clients', error)
  return data ?? []
}

async function readJob(service: ServiceClient, jobId: string): Promise<JobRow> {
  const { data, error } = await service
    .from('client_import_jobs')
    .select('id, status, total_rows, imported_count, merged_count, skipped_count, error_count')
    .eq('id', jobId)
    .single()
  await assertNoSupabaseError('read import job', error)

  if (!data) {
    throw new Error('read import job: missing row')
  }

  return data as JobRow
}

test('client import SS-09 keeps 10k duplicate lookup bounded to candidate filters', async () => {
  const rows: ImportRow[] = Array.from({ length: 10_000 }, (_, index) => ({
    Name: `CSV Client ${index + 1}`,
    Email: `csv-import-${index + 1}@example.com`,
    Phone: `+3907${String(index + 1).padStart(8, '0')}`,
  }))
  const lookupKeys = collectImportLookupKeys(rows, {
    Name: 'full_name',
    Email: 'email',
    Phone: 'phone',
  })
  const calls: LookupCall[] = []

  const result = await fetchClientImportDuplicateCandidates(
    createLookupMockDb(calls),
    'tenant-import-lookup',
    lookupKeys,
  )

  expect(result.error).toBeUndefined()
  expect(result.data).toEqual([])
  expect(calls).toHaveLength(100)
  expect(calls.filter((call) => call.column === 'email')).toHaveLength(50)
  expect(calls.filter((call) => call.column === 'phone')).toHaveLength(50)
  expect(calls.every((call) => call.values.length <= CLIENT_IMPORT_FALLBACK_LOOKUP_CHUNK_SIZE)).toBe(true)
})

test('client import SS-09 preserves merge semantics for existing and pending duplicates', () => {
  const plan = prepareClientImportPlan({
    tenantId: 'tenant-merge-semantics',
    existingClients: [
      {
        id: 'existing-email',
        full_name: 'Mario Existing',
        email: 'existing@example.com',
        phone: null,
        marketing_consent: false,
        tags: ['vip'],
      },
    ],
    rows: [
      {
        Name: 'Mario Updated',
        Email: 'existing@example.com',
        Phone: '333 111 2222',
        Tags: 'vip;updated',
        Marketing: 'si',
      },
      {
        Name: 'Pending Primary',
        Email: 'pending@example.com',
        Phone: '+390031234567',
        Tags: 'fresh',
        Marketing: '',
      },
      {
        Name: 'Pending Secondary',
        Email: 'pending@example.com',
        Phone: '+390031234567',
        Tags: 'second',
        Marketing: 'true',
      },
    ],
    mapping: buildCsvMapping(),
    duplicateStrategy: 'merge',
    fallbackTags: ['imported'],
  })

  expect(plan.errors).toEqual([])
  expect(plan.skipped).toBe(0)
  expect(plan.merged).toBe(2)
  expect(plan.toUpdate).toEqual([
    {
      id: 'existing-email',
      patch: {
        full_name: 'Mario Updated',
        phone: '+393331112222',
        marketing_consent: true,
        tags: '["vip","updated"]',
      },
    },
  ])
  expect(plan.toInsert).toEqual([
    {
      tenant_id: 'tenant-merge-semantics',
      full_name: 'Pending Secondary',
      email: 'pending@example.com',
      phone: '+390031234567',
      date_of_birth: null,
      marketing_consent: true,
      preferred_contact_channel: 'whatsapp',
      tags: '["fresh","second"]',
    },
  ])
})

test.describe.serial('client import DB path SS-09', () => {
  test.skip(!hasSupabaseSeedEnv, 'Requires Supabase service-role env for CSV import SS-09 fixtures.')

  test('duplicates by email/phone stay correct and tenant-isolated', async () => {
    const fixture = await createImportFixture()

    try {
      const [tenantAEmailClient, tenantAPhoneClient, tenantBSecretClient] = await insertClients(
        fixture.service,
        [
          {
            tenant_id: fixture.tenantAId,
            full_name: 'Existing Email Client',
            email: 'merge-email@example.com',
            phone: null,
            marketing_consent: false,
            tags: ['vip'],
          },
          {
            tenant_id: fixture.tenantAId,
            full_name: 'Existing Phone Client',
            email: null,
            phone: '+390020000000',
            marketing_consent: false,
            tags: ['legacy'],
          },
          {
            tenant_id: fixture.tenantBId,
            full_name: 'Tenant B Secret Client',
            email: 'tenant-b-only@example.com',
            phone: '+390099999999',
            marketing_consent: false,
            tags: ['secret'],
          },
        ],
      )

      const result = await importClientsForTenant({
        db: fixture.service,
        tenantId: fixture.tenantAId,
        initiatedBy: fixture.initiatedBy,
        input: {
          source: 'csv_generic',
          filename: 'tenant-a-import.csv',
          mapping: buildCsvMapping(),
          duplicateStrategy: 'merge',
          rows: [
            {
              Name: 'Merged By Email',
              Email: 'merge-email@example.com',
              Phone: '333 111 2222',
              Tags: 'vip;from-csv',
              Marketing: 'si',
            },
            {
              Name: 'Merged By Phone',
              Email: 'merged-by-phone@example.com',
              Phone: '+390020000000',
              Tags: 'legacy;from-phone',
              Marketing: '',
            },
            {
              Name: 'Tenant A Clone',
              Email: 'tenant-b-only@example.com',
              Phone: '+390030000000',
              Tags: 'clone',
              Marketing: '',
            },
          ],
        },
      })

      expect(result.status).toBe('completed')
      expect(result.imported).toBe(1)
      expect(result.merged).toBe(2)
      expect(result.skipped).toBe(0)
      expect(result.errors).toEqual([])

      const { data: tenantAClients, error: tenantAClientsError } = await fixture.service
        .from('clients')
        .select('id, full_name, email, phone, marketing_consent, tags')
        .eq('tenant_id', fixture.tenantAId)
      await assertNoSupabaseError('read tenant A imported clients', tenantAClientsError)

      const emailClient = (tenantAClients ?? []).find((client) => client.id === tenantAEmailClient.id)
      const phoneClient = (tenantAClients ?? []).find((client) => client.id === tenantAPhoneClient.id)
      const clonedClient = (tenantAClients ?? []).find((client) => client.email === 'tenant-b-only@example.com')

      expect(emailClient?.full_name).toBe('Merged By Email')
      expect(emailClient?.phone).toBe('+393331112222')
      expect(emailClient?.marketing_consent).toBe(true)
      expect(readTags(emailClient?.tags)).toEqual(['vip', 'from-csv'])

      expect(phoneClient?.full_name).toBe('Merged By Phone')
      expect(phoneClient?.email).toBe('merged-by-phone@example.com')
      expect(readTags(phoneClient?.tags)).toEqual(['legacy', 'from-phone'])

      expect(clonedClient?.id).not.toBe(tenantBSecretClient.id)
      expect(clonedClient?.full_name).toBe('Tenant A Clone')
      expect(clonedClient?.phone).toBe('+390030000000')

      const { data: tenantBClient, error: tenantBClientError } = await fixture.service
        .from('clients')
        .select('full_name, phone, tags')
        .eq('id', tenantBSecretClient.id)
        .single()
      await assertNoSupabaseError('read tenant B secret client', tenantBClientError)

      expect(tenantBClient?.full_name).toBe('Tenant B Secret Client')
      expect(tenantBClient?.phone).toBe('+390099999999')
      expect(readTags(tenantBClient?.tags)).toEqual(['secret'])
    } finally {
      await fixture.cleanup()
    }
  })

  test('client import jobs keep completed, partial, and failed statuses coherent', async () => {
    const fixture = await createImportFixture()

    try {
      await insertClients(fixture.service, [
        {
          tenant_id: fixture.tenantAId,
          full_name: 'Conflict Email Client',
          email: 'status-conflict@example.com',
          phone: '+390011111111',
          tags: ['existing-email'],
        },
        {
          tenant_id: fixture.tenantAId,
          full_name: 'Conflict Phone Client',
          email: 'status-phone@example.com',
          phone: '+390022222222',
          tags: ['existing-phone'],
        },
      ])

      const completed = await importClientsForTenant({
        db: fixture.service,
        tenantId: fixture.tenantAId,
        initiatedBy: fixture.initiatedBy,
        input: {
          source: 'csv_generic',
          filename: 'completed.csv',
          mapping: buildCsvMapping(),
          duplicateStrategy: 'merge',
          rows: [
            {
              Name: 'Completed Import',
              Email: 'completed@example.com',
              Phone: '+390033333333',
              Tags: 'completed',
              Marketing: '',
            },
          ],
        },
      })

      const partial = await importClientsForTenant({
        db: fixture.service,
        tenantId: fixture.tenantAId,
        initiatedBy: fixture.initiatedBy,
        input: {
          source: 'csv_generic',
          filename: 'partial.csv',
          mapping: buildCsvMapping(),
          duplicateStrategy: 'merge',
          rows: [
            {
              Name: 'Partial Import',
              Email: 'partial@example.com',
              Phone: '+390044444444',
              Tags: 'partial',
              Marketing: '',
            },
            {
              Name: 'Conflict Row',
              Email: 'status-conflict@example.com',
              Phone: '+390022222222',
              Tags: 'conflict',
              Marketing: '',
            },
          ],
        },
      })

      const failed = await importClientsForTenant({
        db: fixture.service,
        tenantId: fixture.tenantAId,
        initiatedBy: fixture.initiatedBy,
        input: {
          source: 'csv_generic',
          filename: 'failed.csv',
          mapping: buildCsvMapping(),
          duplicateStrategy: 'merge',
          rows: [
            {
              Name: '',
              Email: 'failed@example.com',
              Phone: '+390055555555',
              Tags: 'failed',
              Marketing: '',
            },
          ],
        },
      })

      expect(completed.status).toBe('completed')
      expect(partial.status).toBe('partial')
      expect(failed.status).toBe('failed')

      expect(completed.jobId).toBeTruthy()
      expect(partial.jobId).toBeTruthy()
      expect(failed.jobId).toBeTruthy()

      const completedJob = await readJob(fixture.service, completed.jobId!)
      const partialJob = await readJob(fixture.service, partial.jobId!)
      const failedJob = await readJob(fixture.service, failed.jobId!)

      expect(completedJob).toMatchObject({
        status: 'completed',
        total_rows: 1,
        imported_count: 1,
        merged_count: 0,
        skipped_count: 0,
        error_count: 0,
      })
      expect(partialJob).toMatchObject({
        status: 'partial',
        total_rows: 2,
        imported_count: 1,
        merged_count: 0,
        skipped_count: 0,
        error_count: 1,
      })
      expect(failedJob).toMatchObject({
        status: 'failed',
        total_rows: 1,
        imported_count: 0,
        merged_count: 0,
        skipped_count: 0,
        error_count: 1,
      })
    } finally {
      await fixture.cleanup()
    }
  })
})
