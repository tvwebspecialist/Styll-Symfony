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
  const db = createAdminClient()
  const weekEnd = addDays(weekStart, 7)

  let apptQuery = db
    .from('appointments')
    .select(
      'id, start_time, end_time, status, booking_source, notes, client_id, staff_id, clients(full_name), appointment_services(services(id, name, category, color, duration_minutes))'
    )
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .gte('start_time', weekStart + 'T00:00:00')
    .lt('start_time', weekEnd + 'T00:00:00')
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
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number }>
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
      .select('id, name, duration_minutes, category, price')
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
    await db.from('appointment_services').insert(
      input.serviceIds.map((serviceId) => ({
        appointment_id: appt.id,
        service_id: serviceId,
      }))
    )
  }

  return { success: true, appointmentId: appt.id }
}
