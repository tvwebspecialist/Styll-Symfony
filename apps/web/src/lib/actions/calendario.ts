'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'

export interface CalendarioAppointment {
  id: string
  start_time: string
  end_time: string
  status: string
  booking_source: string
  notes: string | null
  client_id: string
  staff_id: string
  client_name: string
  total_price: number
  services: Array<{
    id: string
    name: string
    category: string | null
    color: string | null
    duration_minutes: number
  }>
}

export interface CalendarioStaff {
  id: string
  profile_id: string
  role: string
  full_name: string | null
  avatar_url: string | null
}

export interface CalendarioWorkingHour {
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

export interface CalendarioOverride {
  staff_id: string
  date: string
  is_closed: boolean
  start_time: string | null
  end_time: string | null
  reason: string | null
}

export interface CalendarioData {
  appointments: CalendarioAppointment[]
  staff: CalendarioStaff[]
  workingHours: CalendarioWorkingHour[]
  overrides: CalendarioOverride[]
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

type RawApptService = {
  price_at_booking: number
  services: {
    id: string
    name: string
    category: string | null
    color: string | null
    duration_minutes: number
  } | null
}
type RawAppt = {
  id: string
  start_time: string
  end_time: string
  status: string
  booking_source: string
  notes: string | null
  client_id: string
  staff_id: string
  clients: { full_name: string } | null
  appointment_services: RawApptService[]
}
type RawStaff = {
  id: string
  profile_id: string
  role: string
  profiles: { full_name: string | null; avatar_url: string | null } | null
}

export async function getCalendarioData(
  tenantId: string,
  weekStart: string,
  staffId?: string | null
): Promise<CalendarioData> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) {
    throw new Error('Unauthorized: tenant mismatch')
  }

  const db = createAdminClient()
  const weekEnd = addDays(weekStart, 7)

  let apptQuery = db
    .from('appointments')
    .select(
      'id, start_time, end_time, status, booking_source, notes, client_id, staff_id, clients(full_name), appointment_services(price_at_booking, services(id, name, category, color, duration_minutes))'
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('start_time', weekStart + 'T00:00:00Z')
    .lt('start_time', weekEnd + 'T00:00:00Z')
    .order('start_time', { ascending: true })

  if (staffId) {
    apptQuery = apptQuery.eq('staff_id', staffId)
  }

  const [{ data: appts }, { data: staffRows }, { data: wh }, { data: ov }] = await Promise.all([
    apptQuery,
    db
      .from('staff_members')
      .select('id, profile_id, role, profiles(full_name, avatar_url)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null),
    db
      .from('working_hours')
      .select('staff_id, day_of_week, start_time, end_time')
      .eq('tenant_id', tenantId),
    db
      .from('working_hour_overrides')
      .select('staff_id, date, is_closed, start_time, end_time, reason')
      .eq('tenant_id', tenantId)
      .gte('date', weekStart)
      .lte('date', weekEnd),
  ])

  const appointments: CalendarioAppointment[] = (
    (appts ?? []) as unknown as RawAppt[]
  ).map((a) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    status: a.status,
    booking_source: a.booking_source,
    notes: a.notes,
    client_id: a.client_id,
    staff_id: a.staff_id,
    client_name: a.clients?.full_name ?? 'Cliente',
    total_price: (a.appointment_services ?? []).reduce((sum, as) => sum + (as.price_at_booking ?? 0), 0),
    services: (a.appointment_services ?? [])
      .filter((as) => as.services !== null)
      .map((as) => ({
        id: as.services!.id,
        name: as.services!.name,
        category: as.services!.category,
        color: as.services!.color,
        duration_minutes: as.services!.duration_minutes,
      })),
  }))

  const staff: CalendarioStaff[] = ((staffRows ?? []) as unknown as RawStaff[]).map((s) => ({
    id: s.id,
    profile_id: s.profile_id,
    role: s.role,
    full_name: s.profiles?.full_name ?? null,
    avatar_url: s.profiles?.avatar_url ?? null,
  }))

  return {
    appointments,
    staff,
    workingHours: (wh ?? []) as CalendarioWorkingHour[],
    overrides: (ov ?? []) as CalendarioOverride[],
  }
}

// ── New server actions ─────────────────────────────────────────────────────

type RawStaffOption = {
  id: string
  profiles: { full_name: string | null } | null
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: string,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { data: appt } = await db
    .from('appointments')
    .select('tenant_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt || appt.tenant_id !== tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const { error } = await db
    .from('appointments')
    .update({ status, notes })
    .eq('id', appointmentId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getCalendarioFormOptions(tenantId: string): Promise<{
  clients: Array<{ id: string; full_name: string | null }>
  staff: Array<{ id: string; full_name: string | null }>
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number; color: string | null }>
}> {
  const db = createAdminClient()

  const [{ data: clients }, { data: staffRows }, { data: services }] = await Promise.all([
    db
      .from('clients')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('full_name'),
    db
      .from('staff_members')
      .select('id, profiles(full_name)')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .is('deleted_at', null),
    db
      .from('services')
      .select('id, name, duration_minutes, category, price, color')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  return {
    clients: ((clients ?? []) as Array<{ id: string; full_name: string | null }>),
    staff: ((staffRows ?? []) as unknown as RawStaffOption[]).map((s) => ({
      id: s.id,
      full_name: s.profiles?.full_name ?? null,
    })),
    services: ((services ?? []) as Array<{
      id: string
      name: string
      duration_minutes: number
      category: string | null
      price: number
      color: string | null
    }>),
  }
}

export async function getStaffLocations(
  staffId: string,
  tenantId: string,
): Promise<Array<{ id: string; name: string }>> {
  const db = createAdminClient()
  const { data } = await db
    .from('staff_locations')
    .select('locations(id, name)')
    .eq('staff_id', staffId)
  const rows = (data ?? []) as unknown as Array<{ locations: { id: string; name: string } | null }>
  return rows
    .map((r) => r.locations)
    .filter((l): l is { id: string; name: string } => l !== null)
}

/** Returns the subset of the given staffIds that have at least one location row. */
export async function getStaffIdsWithLocations(staffIds: string[]): Promise<string[]> {
  if (staffIds.length === 0) return []
  const db = createAdminClient()
  const { data } = await db
    .from('staff_locations')
    .select('staff_id')
    .in('staff_id', staffIds)
  if (!data) return []
  return [...new Set((data as Array<{ staff_id: string }>).map((r) => r.staff_id))]
}

export async function createAppointment(input: {
  tenantId: string
  clientId: string
  staffId: string
  locationId: string
  serviceIds: string[]
  startTime: string
  endTime: string
  notes?: string | null
  status?: string
}): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== input.tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }
  if (!input.locationId) {
    return { success: false, error: 'Location non selezionata' }
  }

  const db = createAdminClient()

  const { data: appt, error } = await db
    .from('appointments')
    .insert({
      tenant_id: input.tenantId,
      client_id: input.clientId,
      staff_id: input.staffId,
      location_id: input.locationId,
      start_time: input.startTime,
      end_time: input.endTime,
      notes: input.notes ?? null,
      status: input.status ?? 'confirmed',
      booking_source: 'dashboard_owner',
    })
    .select('id')
    .single()

  if (error || !appt) return { success: false, error: error?.message ?? 'Errore sconosciuto' }

  if (input.serviceIds.length > 0) {
    const { data: svcPrices } = await db
      .from('services')
      .select('id, price')
      .in('id', input.serviceIds)

    const { error: asErr } = await db.from('appointment_services').insert(
      input.serviceIds.map((serviceId) => ({
        appointment_id: appt.id,
        service_id: serviceId,
        tenant_id: input.tenantId,
        price_at_booking: svcPrices?.find((s) => s.id === serviceId)?.price ?? 0,
      }))
    )

    if (asErr) {
      // Compensating delete: remove the orphan appointment
      await db
        .from('appointments')
        .delete()
        .eq('id', appt.id)
        .eq('tenant_id', input.tenantId)

      return {
        success: false,
        error: `Errore salvataggio servizi, appuntamento annullato: ${asErr.message}`,
      }
    }
  }

  return { success: true, appointmentId: appt.id }
}

export async function updateAppointmentStaff(
  appointmentId: string,
  staffId: string
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { data: appt } = await db
    .from('appointments')
    .select('tenant_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt || appt.tenant_id !== tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const { error } = await db
    .from('appointments')
    .update({ staff_id: staffId })
    .eq('id', appointmentId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function updateAppointmentServices(
  appointmentId: string,
  serviceIds: string[],
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  const activeTenantId = await getActiveTenantId()
  if (!activeTenantId || activeTenantId !== tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  const db = createAdminClient()

  const { data: appt } = await db
    .from('appointments')
    .select('tenant_id')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt || appt.tenant_id !== tenantId) {
    return { success: false, error: 'Non autorizzato' }
  }

  await db.from('appointment_services').delete().eq('appointment_id', appointmentId)

  if (serviceIds.length > 0) {
    const { data: services } = await db
      .from('services')
      .select('id, price')
      .in('id', serviceIds)

    const rows = serviceIds.map((serviceId) => {
      const service = services?.find((s) => s.id === serviceId)
      return {
        appointment_id: appointmentId,
        service_id: serviceId,
        price_at_booking: service?.price ?? 0,
        tenant_id: tenantId,
      }
    })

    const { error } = await db.from('appointment_services').insert(rows)
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}
