'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Json, TablesUpdate, TablesInsert } from '@/types'

import { bumpAdmin, requireSuperadmin, type ActionResult } from './actions'

async function logAdminAction(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  tenantId: string | null = null,
  details: Record<string, unknown> = {}
) {
  try {
    const db = createAdminClient()
    await db.from('admin_audit_log').insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      tenant_id: tenantId,
      details: details as unknown as Json,
    })
  } catch {
    // best-effort
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

export async function listTenantClients(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (
            c: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{ data: TenantClientRow[] | null; error: { message: string } | null }>
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('clients')
    .select('id, full_name, phone, email, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  return { success: true, data: data ?? [] }
}

export interface TenantAppointmentRow {
  id: string
  starts_at: string
  status: string
  client_name: string | null
}

export async function listTenantAppointments(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient() as unknown as {
    from: (t: string) => {
      select: (s: string) => {
        eq: (c: string, v: string) => {
          order: (
            c: string,
            opts: { ascending: boolean }
          ) => {
            limit: (n: number) => Promise<{
              data:
                | Array<{
                    id: string
                    starts_at: string
                    status: string
                    client: { full_name: string | null } | { full_name: string | null }[] | null
                  }>
                | null
              error: { message: string } | null
            }>
          }
        }
      }
    }
  }
  const { data, error } = await db
    .from('appointments')
    .select('id, starts_at, status, client:clients(full_name)')
    .eq('tenant_id', tenantId)
    .order('starts_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows: TenantAppointmentRow[] = (data ?? []).map((r) => {
    const c = Array.isArray(r.client) ? r.client[0] : r.client
    return {
      id: r.id,
      starts_at: r.starts_at,
      status: r.status,
      client_name: c?.full_name ?? null,
    }
  })
  return { success: true, data: rows }
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
  const db = createAdminClient()
  const { error } = await db.from('clients').insert({
    tenant_id: tenantId,
    full_name: input.full_name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    marketing_consent: true,
    preferred_contact_channel: 'whatsapp',
    tags: '["active"]',
  })
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.created', 'client', null, tenantId, {
    name: input.full_name,
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
}

export async function deleteTenantClient(
  tenantId: string,
  clientId: string
): Promise<ActionResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  // Soft delete — clients use deleted_at (never hard delete, see CLAUDE.md)
  const { error } = await db
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.deleted', 'client', clientId, tenantId)
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
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
  const db = createAdminClient()
  const rows = Array.from({ length: Math.min(Math.max(count, 1), 50) }, () => {
    const first = pick(DEMO_FIRST_NAMES)
    const last = pick(DEMO_LAST_NAMES)
    const slug = `${first.toLowerCase()}.${last.toLowerCase().replace(/\s+/g, '')}`
    const suffix = Math.floor(Math.random() * 1000)
    return {
      tenant_id: tenantId,
      full_name: `${first} ${last}`,
      email: `${slug}${suffix}@${pick(DEMO_DOMAINS)}`,
      phone: randomPhone(),
      marketing_consent: true,
      preferred_contact_channel: 'whatsapp',
      tags: '["active"]',
    }
  })
  const { error, data } = await db.from('clients').insert(rows).select('id')
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.seeded', 'client', null, tenantId, {
    count: data?.length ?? rows.length,
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true, inserted: data?.length ?? rows.length }
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
  const db = createAdminClient()
  const patch: TablesUpdate<'clients'> = {}
  if (input.full_name !== undefined) patch.full_name = input.full_name?.trim() || undefined
  if (input.email !== undefined) patch.email = input.email?.trim() || null
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
  if (input.tags !== undefined) {
    patch.tags = input.tags ? JSON.stringify(input.tags) : null
  }
  if (input.marketing_consent !== undefined) patch.marketing_consent = !!input.marketing_consent
  const { error } = await db
    .from('clients')
    .update(patch)
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  await logAdminAction(auth.id, 'client.updated', 'client', clientId, tenantId, {
    fields: Object.keys(patch),
  })
  revalidatePath(`/admin/tenants/${tenantId}/clients`)
  return { success: true }
}

// =====================================================
// TENANT CLIENT — DETAILED READ (with tags + consent)
// =====================================================

export interface TenantClientDetailedRow {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  tags: string[]
  marketing_consent: boolean
  profile_id: string | null
  avatar_url: string | null
  created_at: string
}

function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t))
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map((t) => String(t)) : []
    } catch {
      return []
    }
  }
  return []
}

export async function listTenantClientsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantClientDetailedRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('clients')
    .select('id, full_name, phone, email, tags, marketing_consent, profile_id, created_at, profile:profiles(avatar_url)')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows = (data ?? []).map((r) => {
    const x = r as unknown as {
      id: string
      full_name: string | null
      phone: string | null
      email: string | null
      tags: unknown
      marketing_consent: boolean | null
      profile_id: string | null
      created_at: string
      profile?: { avatar_url: string | null } | { avatar_url: string | null }[] | null
    }
    const prof = Array.isArray(x.profile) ? x.profile[0] : x.profile
    return {
      id: x.id,
      full_name: x.full_name,
      phone: x.phone,
      email: x.email,
      tags: parseTags(x.tags),
      marketing_consent: !!x.marketing_consent,
      profile_id: x.profile_id,
      avatar_url: prof?.avatar_url ?? null,
      created_at: x.created_at,
    }
  })
  return { success: true, data: rows }
}

// =====================================================
// TENANT APPOINTMENTS — DETAILED READ (admin)
// =====================================================

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

export async function listTenantAppointmentsDetailed(
  tenantId: string
): Promise<{ success: boolean; data?: TenantAppointmentDetailedRow[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const { data, error } = await db
    .from('appointments')
    .select(
      'id, start_time, end_time, status, client_id, location_id, staff_id, client:clients(full_name), staff:staff_members(profile:profiles(full_name)), appointment_services(price_at_booking, services(name))'
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('start_time', { ascending: false })
    .limit(200)
  if (error) return { success: false, error: error.message }
  const rows = (data ?? []).map((raw) => {
    const r = raw as unknown as {
      id: string
      start_time: string
      end_time: string
      status: string
      client_id: string
      staff_id: string
      location_id: string
      client: { full_name: string | null } | { full_name: string | null }[] | null
      staff:
        | { profile: { full_name: string | null } | { full_name: string | null }[] | null }
        | { profile: { full_name: string | null } | { full_name: string | null }[] | null }[]
        | null
      appointment_services:
        | Array<{
            price_at_booking: number | null
            services: { name: string | null } | { name: string | null }[] | null
          }>
        | null
    }
    const client = Array.isArray(r.client) ? r.client[0] : r.client
    const staffOuter = Array.isArray(r.staff) ? r.staff[0] : r.staff
    const staffProfile = staffOuter
      ? Array.isArray(staffOuter.profile)
        ? staffOuter.profile[0]
        : staffOuter.profile
      : null
    const services = (r.appointment_services ?? []).map((as) => {
      const sv = Array.isArray(as.services) ? as.services[0] : as.services
      return { name: sv?.name ?? null, price: Number(as.price_at_booking ?? 0) }
    })
    return {
      id: r.id,
      start_time: r.start_time,
      end_time: r.end_time,
      status: r.status,
      client_id: r.client_id,
      client_name: client?.full_name ?? null,
      staff_id: r.staff_id,
      staff_name: staffProfile?.full_name ?? null,
      location_id: r.location_id,
      service_names: services.map((s) => s.name).filter((n): n is string => !!n),
      total_price: services.reduce((s, x) => s + x.price, 0),
    }
  })
  return { success: true, data: rows }
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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }
  const db = createAdminClient()
  const [clients, staff, services, locations] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name, email')
      .eq('tenant_id', tenantId)
      .order('full_name', { ascending: true })
      .limit(500),
    db
      .from('staff_members')
      .select('id, role, profile:profiles(full_name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .limit(100),
    db
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(200),
    db.from('locations').select('id, name').eq('tenant_id', tenantId).limit(50),
  ])
  if (clients.error) return { success: false, error: clients.error.message }
  if (staff.error) return { success: false, error: staff.error.message }
  if (services.error) return { success: false, error: services.error.message }
  if (locations.error) return { success: false, error: locations.error.message }
  const staffRows = (staff.data ?? []).map((row) => {
    const r = row as {
      id: string
      role: string | null
      profile: { full_name: string | null } | { full_name: string | null }[] | null
    }
    const p = Array.isArray(r.profile) ? r.profile[0] : r.profile
    return { id: r.id, name: p?.full_name ?? null, role: r.role }
  })
  return {
    success: true,
    data: {
      clients: (clients.data ?? []) as Array<{
        id: string
        full_name: string | null
        email: string | null
      }>,
      staff: staffRows,
      services: (services.data ?? []).map((s) => {
        const r = s as {
          id: string
          name: string
          price: number
          duration_minutes: number
        }
        return {
          id: r.id,
          name: r.name,
          price: Number(r.price ?? 0),
          duration_minutes: Number(r.duration_minutes ?? 0),
        }
      }),
      locations: (locations.data ?? []) as Array<{ id: string; name: string }>,
    },
  }
}

// =====================================================
// CLIENT IMPORT (concierge / migration)
// =====================================================

import type {
  ImportClientsInput,
  ImportClientsResult,
  ImportError,
} from '@/lib/actions/clienti'
import {
  normalizePhone,
  normalizeEmail,
  parseDateOfBirth,
  parseBooleanField,
  parseCsvTags,
} from '@/lib/utils/client-import-utils'

/**
 * Variant of importClients for superadmin concierge mode.
 * Operates on an explicit tenantId (skips getCurrentTenantId),
 * tags imported rows with 'concierge', and logs to admin_audit_log.
 */
export async function importClientsForTenant(
  tenantId: string,
  input: ImportClientsInput,
): Promise<ImportClientsResult> {
  const auth = await requireSuperadmin()
  if ('error' in auth) {
    return { success: false, error: auth.error, imported: 0, skipped: 0, errors: [] }
  }
  if (!tenantId) {
    return { success: false, error: 'Tenant ID mancante', imported: 0, skipped: 0, errors: [] }
  }
  if (!input.rows || input.rows.length === 0) {
    return { success: false, error: 'Nessuna riga', imported: 0, skipped: 0, errors: [] }
  }
  if (input.rows.length > 10_000) {
    return { success: false, error: 'Massimo 10.000 righe', imported: 0, skipped: 0, errors: [] }
  }
  const hasName = Object.values(input.mapping).includes('full_name')
  if (!hasName) {
    return { success: false, error: 'Mappa la colonna Nome', imported: 0, skipped: 0, errors: [] }
  }

  const db = createAdminClient()

  const { data: tenantRow } = await db
    .from('tenants')
    .select('id, business_name')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenantRow) {
    return { success: false, error: 'Tenant non trovato', imported: 0, skipped: 0, errors: [] }
  }

  const { data: existing } = await db
    .from('clients')
    .select('id, email, phone')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  const existingByEmail = new Map<string, string>()
  const existingByPhone = new Map<string, string>()
  ;(existing ?? []).forEach((c) => {
    if (c.email) existingByEmail.set(c.email.toLowerCase(), c.id)
    if (c.phone) { const norm = normalizePhone(c.phone); if (norm) existingByPhone.set(norm, c.id) }
  })

  const errors: ImportError[] = []
  const toInsert: TablesInsert<'clients'>[] = []
  let skipped = 0

  const inv: Partial<Record<string, string>> = {}
  for (const [orig, styll] of Object.entries(input.mapping)) {
    if (styll !== 'ignore') inv[styll] = orig
  }

  for (let i = 0; i < input.rows.length; i++) {
    const row = input.rows[i]
    const rowNum = i + 1

    const rawName = inv.full_name ? row[inv.full_name] ?? '' : ''
    const fullName = rawName.trim()
    if (!fullName) { errors.push({ rowIndex: rowNum, field: 'full_name', message: 'Nome mancante' }); continue }

    const rawEmail = inv.email ? row[inv.email] ?? '' : ''
    const email = rawEmail ? normalizeEmail(rawEmail) : null
    if (rawEmail && !email) errors.push({ rowIndex: rowNum, field: 'email', message: `Email non valida: ${rawEmail}` })

    const rawPhone = inv.phone ? row[inv.phone] ?? '' : ''
    const phone = rawPhone ? normalizePhone(rawPhone) : null
    if (rawPhone && !phone) errors.push({ rowIndex: rowNum, field: 'phone', message: `Telefono non valido: ${rawPhone}` })

    const dupId = (email && existingByEmail.get(email)) || (phone && existingByPhone.get(phone)) || null
    if (dupId) { skipped++; continue }

    const rawDob = inv.date_of_birth ? row[inv.date_of_birth] ?? '' : ''
    const dob = rawDob ? parseDateOfBirth(rawDob) : null

    const rawTags = inv.tags ? row[inv.tags] ?? '' : ''
    const tagsArr = parseCsvTags(rawTags)
    if (tagsArr.length === 0) tagsArr.push('imported')
    if (!tagsArr.includes('concierge')) tagsArr.push('concierge')

    const rawConsent = inv.marketing_consent ? row[inv.marketing_consent] ?? '' : ''
    const marketingConsent = rawConsent ? parseBooleanField(rawConsent) : false

    toInsert.push({
      tenant_id: tenantId,
      full_name: fullName,
      email,
      phone,
      date_of_birth: dob,
      marketing_consent: marketingConsent,
      preferred_contact_channel: 'whatsapp',
      tags: JSON.stringify(tagsArr),
    })
  }

  let imported = 0
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 500) {
      const chunk = toInsert.slice(i, i + 500)
      const { error, count } = await db.from('clients').insert(chunk, { count: 'exact' })
      if (error) { errors.push({ rowIndex: 0, message: `Errore DB: ${error.message}` }); break }
      imported += count ?? chunk.length
    }
  }

  const status: 'completed' | 'partial' | 'failed' =
    imported === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'completed'

  const { data: jobRow } = await db
    .from('client_import_jobs')
    .insert({
      tenant_id: tenantId,
      initiated_by: auth.id,
      source: input.source,
      filename: input.filename ?? null,
      total_rows: input.rows.length,
      imported_count: imported,
      skipped_count: skipped,
      error_count: errors.length,
      errors: errors.slice(0, 100) as unknown as Json,
      status,
    })
    .select('id')
    .single()

  await logAdminAction(auth.id, 'client.import.concierge', 'tenant', tenantId, tenantId, {
    tenant_name: tenantRow.business_name,
    source: input.source,
    filename: input.filename ?? null,
    total: input.rows.length,
    imported,
    skipped,
    errors: errors.length,
  })

  revalidatePath(`/admin/tenants/${tenantId}/migration`)
  revalidatePath(`/admin/tenants/${tenantId}/clients`)

  return {
    success: imported > 0 || errors.length === 0,
    jobId: jobRow?.id,
    imported,
    skipped,
    errors,
  }
}

export interface ImportJobRow {
  id: string
  source: string | null
  filename: string | null
  total_rows: number
  imported_count: number
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
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { data, error } = await db
    .from('client_import_jobs')
    .select('id, source, filename, total_rows, imported_count, skipped_count, error_count, status, initiated_by, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { success: false, error: error.message }

  const userIds = [...new Set((data ?? []).map((j) => j.initiated_by).filter((x): x is string => Boolean(x)))]
  const emailMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profs } = await db.from('profiles').select('id, email').in('id', userIds)
    ;(profs ?? []).forEach((p) => { if (p.email) emailMap.set(p.id, p.email) })
  }

  const rows: ImportJobRow[] = (data ?? []).map((j) => ({
    ...j,
    initiator_email: j.initiated_by ? (emailMap.get(j.initiated_by) ?? null) : null,
  }))

  return { success: true, data: rows }
}

export async function getImportJobErrors(
  tenantId: string,
  jobId: string,
): Promise<{ success: boolean; errors?: ImportError[]; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { success: false, error: auth.error }

  const db = createAdminClient()
  const { data, error } = await db
    .from('client_import_jobs')
    .select('errors')
    .eq('tenant_id', tenantId)
    .eq('id', jobId)
    .maybeSingle()

  if (error) return { success: false, error: error.message }
  return { success: true, errors: (data?.errors ?? []) as unknown as ImportError[] }
}
