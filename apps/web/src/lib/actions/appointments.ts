'use server'

import { revalidatePath } from 'next/cache'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface ActionResult {
  success: boolean
  error?: string
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface CreateAppointmentInput {
  tenantId: string
  clientId: string
  staffId: string
  locationId: string
  serviceIds: string[]
  startTime: string
  status?: AppointmentStatus
  bookingSource?: string
}

export interface AppointmentSummary {
  id: string
  tenant_id: string
  client_id: string
  staff_id: string
  location_id: string
  start_time: string
  end_time: string
  status: AppointmentStatus
}

type AppointmentRow = AppointmentSummary

async function ensureSuperadmin(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  return data?.is_superadmin ? user.id : null
}

async function ensureTenantAccess(tenantId: string): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.is_superadmin) return { userId: user.id }
  const { data: staff } = await db
    .from('staff_members')
    .select('id')
    .eq('profile_id', user.id)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (!staff) return null
  return { userId: user.id }
}

/**
 * Compute end_time from a start ISO string + total duration (minutes).
 */
function addMinutes(iso: string, minutes: number): string {
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() + minutes)
  return d.toISOString()
}

/**
 * Create an appointment + appointment_services rows.
 * end_time is computed from sum of services.duration_minutes.
 * Returns the created appointment row.
 */
export async function createAppointment(
  input: CreateAppointmentInput
): Promise<ActionResult & { data?: AppointmentSummary }> {
  const access = await ensureTenantAccess(input.tenantId)
  if (!access) return { success: false, error: 'Permessi insufficienti.' }
  if (!input.clientId || !input.staffId || !input.locationId) {
    return { success: false, error: 'Cliente, staff e sede sono obbligatori.' }
  }
  if (!input.serviceIds.length) {
    return { success: false, error: 'Seleziona almeno un servizio.' }
  }
  if (!input.startTime || Number.isNaN(new Date(input.startTime).getTime())) {
    return { success: false, error: 'Orario di inizio non valido.' }
  }

  const db = createAdminClient()

  // Verify client, staff, and location all belong to this tenant
  const [clientChk, staffChk, locationChk] = await Promise.all([
    db
      .from('clients')
      .select('id')
      .eq('id', input.clientId)
      .eq('tenant_id', input.tenantId)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('staff_members')
      .select('id')
      .eq('id', input.staffId)
      .eq('tenant_id', input.tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('locations')
      .select('id')
      .eq('id', input.locationId)
      .eq('tenant_id', input.tenantId)
      .maybeSingle(),
  ])

  if (!clientChk.data) return { success: false, error: 'Cliente non valido.' }
  if (!staffChk.data) return { success: false, error: 'Barbiere non valido.' }
  if (!locationChk.data) return { success: false, error: 'Sede non valida.' }

  const { data: services, error: svcErr } = await db
    .from('services')
    .select('id, price, duration_minutes, tenant_id')
    .eq('tenant_id', input.tenantId)
    .in('id', input.serviceIds)
  if (svcErr) return { success: false, error: svcErr.message }
  if (!services || services.length !== input.serviceIds.length) {
    return { success: false, error: 'Servizi non trovati per questo tenant.' }
  }

  const totalMinutes = services.reduce(
    (s, r) => s + (Number((r as { duration_minutes: number }).duration_minutes) || 0),
    0
  )
  const startIso = new Date(input.startTime).toISOString()
  const endIso = addMinutes(startIso, totalMinutes || 30)

  const { data: appt, error: apptErr } = await db
    .from('appointments')
    .insert({
      tenant_id: input.tenantId,
      client_id: input.clientId,
      staff_id: input.staffId,
      location_id: input.locationId,
      start_time: startIso,
      end_time: endIso,
      status: input.status ?? 'confirmed',
      booking_source: input.bookingSource ?? 'dashboard_owner',
    })
    .select('id, tenant_id, client_id, staff_id, location_id, start_time, end_time, status')
    .single()
  if (apptErr || !appt) {
    return { success: false, error: apptErr?.message ?? 'Errore creazione appuntamento.' }
  }

  const apptRow = appt as unknown as AppointmentRow
  const linkRows = (services as Array<{ id: string; price: number }>).map((s) => ({
    tenant_id: input.tenantId,
    appointment_id: apptRow.id,
    service_id: s.id,
    price_at_booking: Number(s.price ?? 0),
  }))
  const { error: linkErr } = await db.from('appointment_services').insert(linkRows)
  if (linkErr) {
    await db.from('appointments').delete().eq('id', apptRow.id)
    return { success: false, error: linkErr.message }
  }

  revalidatePath(`/admin/tenants/${input.tenantId}/appointments`)
  revalidatePath('/dashboard/vendite')
  revalidatePath('/dashboard/clienti')
  return { success: true, data: apptRow }
}

export async function updateAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  status: AppointmentStatus
): Promise<ActionResult> {
  const access = await ensureTenantAccess(tenantId)
  if (!access) return { success: false, error: 'Permessi insufficienti.' }
  const db = createAdminClient()
  const { error } = await db
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/appointments`)
  revalidatePath('/dashboard/vendite')
  return { success: true }
}

export async function deleteAppointment(
  tenantId: string,
  appointmentId: string
): Promise<ActionResult> {
  const access = await ensureTenantAccess(tenantId)
  if (!access) return { success: false, error: 'Permessi insufficienti.' }
  const db = createAdminClient()
  // Soft delete — appointments use deleted_at (never hard delete, see CLAUDE.md).
  // appointment_services rows are kept as immutable price-snapshot history; the
  // parent appointment is hidden by the deleted_at filter on all read queries.
  const { error } = await db
    .from('appointments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  revalidatePath(`/admin/tenants/${tenantId}/appointments`)
  revalidatePath('/dashboard/vendite')
  return { success: true }
}

/**
 * Generate `count` random appointments distributed across the past 30 days.
 * Uses existing clients/staff/services/locations of the tenant.
 * Marks ~80% as 'completed' so they appear in vendite.
 */
export async function seedRandomAppointments(
  tenantId: string,
  count: number = 25
): Promise<ActionResult & { inserted?: number }> {
  const userId = await ensureSuperadmin()
  if (!userId) return { success: false, error: 'Permessi insufficienti.' }
  const db = createAdminClient()

  const [{ data: clients }, { data: staff }, { data: services }, { data: locations }] =
    await Promise.all([
      db.from('clients').select('id').eq('tenant_id', tenantId).limit(500),
      db
        .from('staff_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(50),
      db
        .from('services')
        .select('id, price, duration_minutes')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .limit(100),
      db.from('locations').select('id').eq('tenant_id', tenantId).limit(20),
    ])

  if (!clients?.length) return { success: false, error: 'Nessun cliente disponibile.' }
  if (!staff?.length) return { success: false, error: 'Nessun membro staff attivo.' }
  if (!services?.length) return { success: false, error: 'Nessun servizio attivo.' }
  if (!locations?.length) return { success: false, error: 'Nessuna sede disponibile.' }

  const N = Math.min(Math.max(count, 1), 100)
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const clientList = clients as Array<{ id: string }>
  const staffList = staff as Array<{ id: string }>
  const locList = locations as Array<{ id: string }>
  const svcList = services as Array<{ id: string; price: number; duration_minutes: number }>

  const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

  const apptInserts: Array<{
    tenant_id: string
    client_id: string
    staff_id: string
    location_id: string
    start_time: string
    end_time: string
    status: AppointmentStatus
    booking_source: string
  }> = []
  const pickedServices: Array<Array<{ id: string; price: number }>> = []

  for (let i = 0; i < N; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const hour = 9 + Math.floor(Math.random() * 9) // 9..17
    const minute = Math.random() < 0.5 ? 0 : 30
    const start = new Date(now - daysAgo * dayMs)
    start.setHours(hour, minute, 0, 0)

    const svcCount = Math.random() < 0.75 ? 1 : 2
    const chosen: Array<{ id: string; price: number; duration_minutes: number }> = []
    while (chosen.length < svcCount) {
      const s = pick(svcList)
      if (!chosen.some((c) => c.id === s.id)) chosen.push(s)
    }
    const totalMin = chosen.reduce((sum, s) => sum + (Number(s.duration_minutes) || 0), 0) || 30
    const end = new Date(start.getTime() + totalMin * 60_000)

    apptInserts.push({
      tenant_id: tenantId,
      client_id: pick(clientList).id,
      staff_id: pick(staffList).id,
      location_id: pick(locList).id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: Math.random() < 0.85 ? 'completed' : 'confirmed',
      booking_source: 'dashboard_owner',
    })
    pickedServices.push(chosen.map((c) => ({ id: c.id, price: Number(c.price ?? 0) })))
  }

  const { data: inserted, error } = await db
    .from('appointments')
    .insert(apptInserts)
    .select('id')
  if (error || !inserted) {
    return { success: false, error: error?.message ?? 'Errore inserimento.' }
  }

  const apptIds = inserted as Array<{ id: string }>
  const links: Array<{
    tenant_id: string
    appointment_id: string
    service_id: string
    price_at_booking: number
  }> = []
  apptIds.forEach((a, idx) => {
    pickedServices[idx].forEach((s) => {
      links.push({
        tenant_id: tenantId,
        appointment_id: a.id,
        service_id: s.id,
        price_at_booking: s.price,
      })
    })
  })
  if (links.length) {
    const { error: linkErr } = await db.from('appointment_services').insert(links)
    if (linkErr) return { success: false, error: linkErr.message }
  }

  revalidatePath(`/admin/tenants/${tenantId}/appointments`)
  revalidatePath('/dashboard/vendite')
  revalidatePath('/dashboard/clienti')
  return { success: true, inserted: apptIds.length }
}
