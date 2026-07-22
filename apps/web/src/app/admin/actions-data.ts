'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

import {
  buildChurnProfilingEvent,
  buildMarketingConsentEvents,
  extractConsentRequestContext,
  type ConsentEventPayload,
} from '@/lib/consent-events'
import { CONSENT_ACTOR, CONSENT_CHANNEL, CONSENT_SOURCE, type ConsentSource } from '@/lib/consent-copy'
import { fetchSymfonyAdminJson, SymfonyAdminApiError } from '@/lib/symfony/admin-client'
import type { Json } from '@/types'
import type {
  ImportClientsInput,
  ImportClientsResult,
  ImportError,
} from '@/lib/actions/clienti'
import {
  buildImportClientsResult,
  prepareClientImportPlan,
} from '@/lib/utils/client-import-core'

import { requireSuperadmin, type ActionResult } from './actions'

function actionError(error: unknown): string {
  if (error instanceof SymfonyAdminApiError) {
    if (error.details.body) {
      try {
        const parsed = JSON.parse(error.details.body) as { error?: string }
        if (parsed.error) return parsed.error
      } catch {}
    }
  }

  return error instanceof Error ? error.message : 'Errore sconosciuto.'
}

type ConsentPayload = {
  actor: typeof CONSENT_ACTOR.SUPERADMIN
  actorProfileId: string
  source: ConsentSource
  events: ConsentEventPayload[]
}

function resolveConsentChannel(source: ConsentSource): typeof CONSENT_CHANNEL[keyof typeof CONSENT_CHANNEL] {
  if (source === CONSENT_SOURCE.CLIENT_IMPORT) return CONSENT_CHANNEL.IMPORT
  if (
    source === CONSENT_SOURCE.STAFF_DASHBOARD ||
    source === CONSENT_SOURCE.SUPERADMIN_PANEL ||
    source === CONSENT_SOURCE.SUPERADMIN_SEED
  ) {
    return CONSENT_CHANNEL.BACKOFFICE
  }
  if (source === CONSENT_SOURCE.LEGACY_MIGRATION) return CONSENT_CHANNEL.SYSTEM
  return CONSENT_CHANNEL.PWA
}

function buildSeedConsentPayload(params: {
  actorProfileId: string
  source: ConsentSource
  marketingAllowed: boolean
  churnAllowed: boolean
  occurredAt?: string
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, Json>
  businessName?: string
}): ConsentPayload {
  const channel = resolveConsentChannel(params.source)
  const baseMetadata = {
    ...(params.metadata ?? {}),
    ip_address_present: Boolean(params.ipAddress),
    user_agent_present: Boolean(params.userAgent),
  } satisfies Record<string, Json>

  return {
    actor: CONSENT_ACTOR.SUPERADMIN,
    actorProfileId: params.actorProfileId,
    source: params.source,
    events: [
      ...buildMarketingConsentEvents({
        allowed: params.marketingAllowed,
        businessName: params.businessName,
        channel,
        occurredAt: params.occurredAt,
        source: params.source,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: baseMetadata,
      }),
      buildChurnProfilingEvent({
        allowed: params.churnAllowed,
        channel,
        occurredAt: params.occurredAt,
        source: params.source,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: baseMetadata,
      }),
    ],
  }
}

function buildMarketingConsentPayload(params: {
  actorProfileId: string
  source: ConsentSource
  allowed: boolean
  occurredAt?: string
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, Json>
}): ConsentPayload {
  const channel = resolveConsentChannel(params.source)

  return {
    actor: CONSENT_ACTOR.SUPERADMIN,
    actorProfileId: params.actorProfileId,
    source: params.source,
    events: buildMarketingConsentEvents({
      allowed: params.allowed,
      channel,
      occurredAt: params.occurredAt,
      source: params.source,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata,
    }),
  }
}

// =====================================================
// TENANT READ-ONLY HELPERS (clients/appointments)
// =====================================================

export interface TenantClientRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export interface TenantClientDetailedRow extends TenantClientRow {
  tags: string[]
  marketing_consent: boolean
  profile_id: string | null
  avatar_url: string | null
  date_of_birth?: string | null
}

export async function listTenantClients(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientRow[]; error?: string }> {
  const res = await listTenantClientsDetailed(tenantId)
  if (!res.success) return res

  return {
    success: true,
    data: (res.data ?? []).map((row) => ({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone,
      email: row.email,
      created_at: row.created_at,
    })),
  }
}

export interface TenantAppointmentRow {
  id: string
  start_time: string
  status: string
  client_name: string | null
}

export interface TenantAppointmentDetailedRow {
  id: string
  start_time: string
  end_time: string
  status: string
  client_id: string
  client_name: string | null
  staff_id: string
  staff_name: string | null
  location_id: string
  service_names: string[]
  total_price: number
}

export async function listTenantAppointments(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentRow[]; error?: string }> {
  const res = await listTenantAppointmentsDetailed(tenantId)
  if (!res.success) return res

  return {
    success: true,
    data: (res.data ?? []).map((row) => ({
      id: row.id,
      start_time: row.start_time,
      status: row.status,
      client_name: row.client_name,
    })),
  }
}

// =====================================================
// TENANT CLIENTS (admin CRUD + seed)
// =====================================================

export interface TenantClientInput {
  full_name: string
  email?: string | null
  phone?: string | null
}

export async function createTenantClient(
  tenantId: string,
  input: TenantClientInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  if (!input.full_name?.trim()) return { success: false, error: 'Nome obbligatorio.' }

  try {
    const requestContext = extractConsentRequestContext(await headers())
    await fetchSymfonyAdminJson(`/api/admin/tenants/${encodeURIComponent(tenantId)}/clients`, {
      method: 'POST',
      body: {
        full_name: input.full_name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        consent: buildSeedConsentPayload({
          actorProfileId: auth.id,
          source: CONSENT_SOURCE.SUPERADMIN_PANEL,
          marketingAllowed: false,
          churnAllowed: true,
          ipAddress: requestContext.ipAddress ?? null,
          userAgent: requestContext.userAgent ?? null,
          metadata: {
            surface: 'admin_create_tenant_client',
          },
        }),
      },
    })
    revalidatePath(`/admin/tenants/${tenantId}/clients`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function deleteTenantClient(
  tenantId: string,
  clientId: string
): Promise<ActionResult> {
  try {
    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/clients/${encodeURIComponent(clientId)}`,
      { method: 'DELETE' }
    )
    revalidatePath(`/admin/tenants/${tenantId}/clients`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

const DEMO_FIRST_NAMES = [
  'Marco', 'Giulia', 'Andrea', 'Sara', 'Luca', 'Chiara', 'Davide', 'Elena',
  'Matteo', 'Francesca', 'Alessandro', 'Valentina', 'Simone', 'Laura',
  'Diego', 'Marta', 'Riccardo', 'Serena', 'Paolo', 'Roberta',
]
const DEMO_LAST_NAMES = [
  'Rossi', 'Bianchi', 'Russo', 'Ferrari', 'Esposito', 'Romano', 'Colombo',
  'Ricci', 'Marino', 'Bruno', 'Conti', 'De Luca', 'Costa', 'Greco', 'Galli',
  'Moretti', 'Fontana', 'Barbieri', 'Mancini', 'Pellegrini',
]
const DEMO_DOMAINS = ['email.it', 'gmail.com', 'libero.it', 'outlook.it']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomPhone(): string {
  const n = 1000000 + Math.floor(Math.random() * 8999999)
  return `+39 3${Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 10)} ${n}`
}

export async function seedDemoClients(
  tenantId: string,
  count: number = 10
): Promise<ActionResult & { inserted?: number }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  try {
    const requestContext = extractConsentRequestContext(await headers())
    const rows = Array.from({ length: Math.min(Math.max(count, 1), 50) }, () => {
      const first = pick(DEMO_FIRST_NAMES)
      const last = pick(DEMO_LAST_NAMES)
      const slug = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, '')}`
      const suffix = Math.floor(Math.random() * 1000)

      return {
        full_name: `${first} ${last}`,
        email: `${slug}${suffix}@${pick(DEMO_DOMAINS)}`,
        phone: randomPhone(),
        marketing_consent: false,
        preferred_contact_channel: 'whatsapp',
        tags: ['active'],
        consent: buildSeedConsentPayload({
          actorProfileId: auth.id,
          source: CONSENT_SOURCE.SUPERADMIN_SEED,
          marketingAllowed: false,
          churnAllowed: true,
          ipAddress: requestContext.ipAddress ?? null,
          userAgent: requestContext.userAgent ?? null,
          metadata: {
            surface: 'admin_seed_demo_clients',
          },
        }),
      }
    })

    const data = await fetchSymfonyAdminJson<{ success: boolean; inserted: number }>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/clients/bulk-create`,
      {
        method: 'POST',
        body: { clients: rows },
      }
    )

    revalidatePath(`/admin/tenants/${tenantId}/clients`)
    return { success: true, inserted: data.inserted }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// TENANT CLIENT — UPDATE
// =====================================================

export interface TenantClientUpdateInput {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  tags?: string[] | null
  marketing_consent?: boolean | null
}

export async function updateTenantClient(
  tenantId: string,
  clientId: string,
  input: TenantClientUpdateInput
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  try {
    const requestContext = extractConsentRequestContext(await headers())
    const body: Record<string, unknown> = {}

    if (input.full_name !== undefined) body.full_name = input.full_name?.trim() || null
    if (input.email !== undefined) body.email = input.email?.trim() || null
    if (input.phone !== undefined) body.phone = input.phone?.trim() || null
    if (input.tags !== undefined) body.tags = input.tags ?? []
    if (input.marketing_consent !== undefined) {
      body.consent = buildMarketingConsentPayload({
        actorProfileId: auth.id,
        source: CONSENT_SOURCE.SUPERADMIN_PANEL,
        allowed: Boolean(input.marketing_consent),
        occurredAt: new Date().toISOString(),
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        metadata: {
          surface: 'admin_update_tenant_client',
          ip_address: requestContext.ipAddress ?? null,
          user_agent: requestContext.userAgent ?? null,
        },
      })
    }

    await fetchSymfonyAdminJson(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/clients/${encodeURIComponent(clientId)}`,
      {
        method: 'PATCH',
        body,
      }
    )
    revalidatePath(`/admin/tenants/${tenantId}/clients`)
    return { success: true }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// TENANT CLIENT — DETAILED READ (with tags + consent)
// =====================================================

export async function listTenantClientsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientDetailedRow[]; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<TenantClientDetailedRow[]>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/clients`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// TENANT APPOINTMENTS — DETAILED READ (admin)
// =====================================================

export async function listTenantAppointmentsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentDetailedRow[]; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<TenantAppointmentDetailedRow[]>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/appointments`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// TENANT APPOINTMENT FORM HELPERS (clients/staff/services/locations)
// =====================================================

export interface AppointmentFormOptions {
  clients: Array<{ id: string; full_name: string | null; email: string | null }>
  staff: Array<{ id: string; name: string | null; role: string | null }>
  services: Array<{ id: string; name: string; price: number; duration_minutes: number }>
  locations: Array<{ id: string; name: string }>
}

export async function getAppointmentFormOptions(
  tenantId: string
): Promise<{ success: boolean; data?: AppointmentFormOptions; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<AppointmentFormOptions>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/appointments/options`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

// =====================================================
// CLIENT IMPORT (concierge / migration)
// =====================================================

function buildImportMetadata(
  input: ImportClientsInput,
  actorProfileId: string,
): Record<string, Json> {
  return {
    import_source: input.source,
    import_filename: input.filename ?? null,
    initiated_by: actorProfileId,
  }
}

export async function importClientsForTenant(
  tenantId: string,
  input: ImportClientsInput,
): Promise<ImportClientsResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return {
      success: false,
      status: 'failed',
      error: auth.error,
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }

  if (!tenantId) {
    return {
      success: false,
      status: 'failed',
      error: 'Tenant ID mancante',
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }

  if (!input.rows || input.rows.length === 0) {
    return {
      success: false,
      status: 'failed',
      error: 'Nessuna riga',
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }

  if (input.rows.length > 10_000) {
    return {
      success: false,
      status: 'failed',
      error: 'Massimo 10.000 righe',
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }

  const hasName = Object.values(input.mapping).includes('full_name')
  if (!hasName) {
    return {
      success: false,
      status: 'failed',
      error: 'Mappa la colonna Nome',
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }

  try {
    const requestContext = extractConsentRequestContext(await headers())
    const existingRes = await listTenantClientsDetailed(tenantId)
    if (!existingRes.success) {
      return {
        success: false,
        status: 'failed',
        error: existingRes.error ?? 'Impossibile leggere i clienti esistenti',
        imported: 0,
        merged: 0,
        skipped: 0,
        errors: [],
      }
    }

    const plan = prepareClientImportPlan({
      tenantId,
      existingClients: existingRes.data ?? [],
      rows: input.rows,
      mapping: input.mapping,
      duplicateStrategy: input.duplicateStrategy,
      fallbackTags: ['imported'],
      alwaysAddTags: ['concierge'],
    })

    const errors: ImportError[] = [...plan.errors]
    const metadata = buildImportMetadata(input, auth.id)
    const occurredAt = new Date().toISOString()

    const toInsert = plan.toInsert.map((row) => ({
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      date_of_birth: row.date_of_birth,
      marketing_consent: row.marketing_consent,
      preferred_contact_channel: row.preferred_contact_channel,
      tags: row.tags,
      consent: buildSeedConsentPayload({
        actorProfileId: auth.id,
        source: CONSENT_SOURCE.CLIENT_IMPORT,
        marketingAllowed: row.marketing_consent,
        churnAllowed: true,
        occurredAt,
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        metadata,
      }),
    }))

    const toUpdate = plan.toUpdate.map((update) => {
      const patch: Record<string, unknown> = { ...update.patch }
      let consent: ConsentPayload | undefined

      if (typeof patch.marketing_consent === 'boolean') {
        consent = buildMarketingConsentPayload({
          actorProfileId: auth.id,
          source: CONSENT_SOURCE.CLIENT_IMPORT,
          allowed: patch.marketing_consent,
          occurredAt,
          ipAddress: requestContext.ipAddress ?? null,
          userAgent: requestContext.userAgent ?? null,
          metadata,
        })
        delete patch.marketing_consent
      }

      return {
        id: update.id,
        patch,
        ...(consent ? { consent } : {}),
      }
    })

    const result = buildImportClientsResult({
      imported: toInsert.length,
      merged: plan.merged,
      skipped: plan.skipped,
      errors,
    })

    const commit = await fetchSymfonyAdminJson<{
      success: boolean
      jobId?: string
      imported: number
    }>(`/api/admin/tenants/${encodeURIComponent(tenantId)}/client-imports/commit`, {
      method: 'POST',
      body: {
        source: input.source,
        filename: input.filename ?? null,
        totalRows: input.rows.length,
        merged: plan.merged,
        skipped: plan.skipped,
        status: result.status,
        errors,
        toInsert,
        toUpdate,
      },
    })

    revalidatePath(`/admin/tenants/${tenantId}/migration`)
    revalidatePath(`/admin/tenants/${tenantId}/clients`)

    return {
      ...result,
      imported: commit.imported,
      jobId: commit.jobId,
    }
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      error: actionError(error),
      imported: 0,
      merged: 0,
      skipped: 0,
      errors: [],
    }
  }
}

export interface ImportJobRow {
  id: string
  source: string | null
  filename: string | null
  total_rows: number
  imported_count: number
  merged_count: number
  skipped_count: number
  error_count: number
  status: string
  initiated_by: string | null
  initiator_email: string | null
  created_at: string
}

export async function listTenantImportJobs(
  tenantId: string,
): Promise<{ success: boolean; data?: ImportJobRow[]; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<ImportJobRow[]>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/client-import-jobs`
    )
    return { success: true, data }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}

export async function getImportJobErrors(
  tenantId: string,
  jobId: string,
): Promise<{ success: boolean; errors?: ImportError[]; error?: string }> {
  try {
    const data = await fetchSymfonyAdminJson<{ errors: ImportError[] }>(
      `/api/admin/tenants/${encodeURIComponent(tenantId)}/client-import-jobs/${encodeURIComponent(jobId)}/errors`
    )
    return { success: true, errors: data.errors ?? [] }
  } catch (error) {
    return { success: false, error: actionError(error) }
  }
}
