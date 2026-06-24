'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getActiveTenantId } from '@/lib/tenant-context'
import { assignPointsOnCompletion } from '@/lib/actions/loyalty'
import { sendTemplatedEmail } from '@/lib/email'
import { sendPushToSubscriptions, getSubscriptionsForProfile } from '@/lib/push/send-notification'
import { getAutomationEnabled } from '@/lib/actions/marketing-automations'
import { getNotificationChannel } from '@/lib/notifications-channel'

/**
 * Verifica che l'utente autenticato sia staff (o superadmin) del tenant indicato.
 * Usato al posto del fragile getActiveTenantId() nei casi in cui tenantId
 * è già noto (passato dal caller) ma serve comunque la verifica lato server.
 */
async function verifyUserTenantAccess(tenantId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non autenticato')

  const db = createAdminClient()
  const { data: staffRow } = await db
    .from('staff_members')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!staffRow) {
    const { data: profile } = await db
      .from('profiles')
      .select('is_superadmin')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile?.is_superadmin) throw new Error('Non autorizzato')
  }
}

/**
 * Verifica che client, staff, location e servizi appartengano tutti al tenant
 * indicato. Previene la creazione di appuntamenti con foreign key cross-tenant.
 * Ritorna i servizi validati (id + price) per riuso dello snapshot prezzo.
 */
async function verifyAppointmentRefs(input: {
  tenantId: string
  clientId: string
  staffId: string
  locationId: string
  serviceIds: string[]
}): Promise<{ ok: true; services: Array<{ id: string; price: number }> } | { ok: false; error: string }> {
  const db = createAdminClient()

  const [clientRes, staffRes, locationRes, servicesRes] = await Promise.all([
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
    input.serviceIds.length > 0
      ? db
          .from('services')
          .select('id, price')
          .eq('tenant_id', input.tenantId)
          .in('id', input.serviceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; price: number }> }),
  ])

  if (!clientRes.data) return { ok: false, error: 'Cliente non valido.' }
  if (!staffRes.data) return { ok: false, error: 'Barbiere non valido.' }
  if (!locationRes.data) return { ok: false, error: 'Sede non valida.' }

  const services = (servicesRes.data ?? []) as Array<{ id: string; price: number }>
  if (services.length !== input.serviceIds.length) {
    return { ok: false, error: 'Uno o più servizi non sono validi.' }
  }

  return { ok: true, services }
}

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
    price_at_booking: number
    applied_promotion_id: string | null
    promotion_title: string | null
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
  applied_promotion_id: string | null
  services: {
    id: string
    name: string
    category: string | null
    color: string | null
    duration_minutes: number
  } | null
  promotions: { title: string } | null
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
  await verifyUserTenantAccess(tenantId)

  const db = createAdminClient()
  const weekEnd = addDays(weekStart, 7)

  let apptQuery = db
    .from('appointments')
    .select(
      'id, start_time, end_time, status, booking_source, notes, client_id, staff_id, clients(full_name), appointment_services(price_at_booking, applied_promotion_id, services(id, name, category, color, duration_minutes), promotions(title))'
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
      .map((as) => {
        const promo = Array.isArray(as.promotions) ? as.promotions[0] : as.promotions
        return {
          id: as.services!.id,
          name: as.services!.name,
          category: as.services!.category,
          color: as.services!.color,
          duration_minutes: as.services!.duration_minutes,
          price_at_booking: as.price_at_booking ?? 0,
          applied_promotion_id: as.applied_promotion_id ?? null,
          promotion_title: promo?.title ?? null,
        }
      }),
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
    .select('tenant_id, location_id')
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

  // Fire-and-forget side-effects on completion
  if (status === 'completed') {
    assignPointsOnCompletion(appointmentId, tenantId).catch((err) => {
      console.error('[loyalty] assignPointsOnCompletion error:', err)
    })
    decrementInventoryOnCompletion(appointmentId, tenantId, (appt as { location_id: string | null }).location_id).catch((err) => {
      console.error('[inventory] decrementInventoryOnCompletion error:', err)
    })
    sendPostVisitNotifications(appointmentId, tenantId).catch((err) => {
      console.error('[post-visit] sendPostVisitNotifications error:', err)
    })
  }

  return { success: true }
}

export async function getCalendarioFormOptions(tenantId: string): Promise<{
  clients:  Array<{ id: string; full_name: string | null }>
  staff:    Array<{ id: string; full_name: string | null }>
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number; color: string | null }>
  products: Array<{ id: string; name: string; brand: string | null; price_sell: number }>
}> {
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()

  const [{ data: clients }, { data: staffRows }, { data: services }, { data: products }] = await Promise.all([
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
    db
      .from('products')
      .select('id, name, brand, price_sell')
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
    products: ((products ?? []) as Array<{
      id: string
      name: string
      brand: string | null
      price_sell: number
    }>),
  }
}

export async function getStaffLocations(
  staffId: string,
  tenantId: string,
): Promise<Array<{ id: string; name: string }>> {
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()
  const { data } = await db
    .from('staff_locations')
    .select('locations(id, name)')
    .eq('staff_id', staffId)
    .eq('tenant_id', tenantId)
  const rows = (data ?? []) as unknown as Array<{ locations: { id: string; name: string } | null }>
  return rows
    .map((r) => r.locations)
    .filter((l): l is { id: string; name: string } => l !== null)
}

/** Returns the subset of the given staffIds that have at least one location row. */
export async function getStaffIdsWithLocations(staffIds: string[], tenantId: string): Promise<string[]> {
  if (staffIds.length === 0) return []
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()
  const { data } = await db
    .from('staff_locations')
    .select('staff_id')
    .eq('tenant_id', tenantId)
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
  try {
    await verifyUserTenantAccess(input.tenantId)
  } catch {
    return { success: false, error: 'Non autorizzato' }
  }
  if (!input.locationId) {
    return { success: false, error: 'Location non selezionata' }
  }

  const refs = await verifyAppointmentRefs({
    tenantId: input.tenantId,
    clientId: input.clientId,
    staffId: input.staffId,
    locationId: input.locationId,
    serviceIds: input.serviceIds,
  })
  if (!refs.ok) {
    return { success: false, error: refs.error }
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
    const { error: asErr } = await db.from('appointment_services').insert(
      input.serviceIds.map((serviceId) => ({
        appointment_id: appt.id,
        service_id: serviceId,
        tenant_id: input.tenantId,
        price_at_booking: refs.services.find((s) => s.id === serviceId)?.price ?? 0,
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

  // Verify the new staff member belongs to the same tenant
  const { data: newStaff } = await db
    .from('staff_members')
    .select('id')
    .eq('id', staffId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (!newStaff) {
    return { success: false, error: 'Barbiere non valido.' }
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
  try {
    await verifyUserTenantAccess(tenantId)
  } catch {
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
      .eq('tenant_id', tenantId)
      .in('id', serviceIds)

    const validServices = (services ?? []) as Array<{ id: string; price: number }>
    if (validServices.length !== serviceIds.length) {
      return { success: false, error: 'Uno o più servizi non sono validi.' }
    }

    const rows = serviceIds.map((serviceId) => {
      const service = validServices.find((s) => s.id === serviceId)
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

// ── Appointment products (barber-side) ─────────────────────────────────────

export interface AppointmentProductRow {
  id:            string
  product_id:    string
  product_name:  string
  product_brand: string | null
  quantity:      number
  price_at_sale: number
}

type RawApptProduct = {
  id:            string
  product_id:    string
  quantity:      number
  price_at_sale: number
  products: { name: string; brand: string | null } | null
}

export async function getAppointmentProducts(
  appointmentId: string,
  tenantId: string,
): Promise<AppointmentProductRow[]> {
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()
  const { data } = await db
    .from('appointment_products')
    .select('id, product_id, quantity, price_at_sale, products(name, brand)')
    .eq('appointment_id', appointmentId)
    .eq('tenant_id', tenantId)
    .order('created_at')
  return ((data ?? []) as unknown as RawApptProduct[]).map((r) => ({
    id:            r.id,
    product_id:    r.product_id,
    product_name:  r.products?.name ?? '—',
    product_brand: r.products?.brand ?? null,
    quantity:      r.quantity,
    price_at_sale: r.price_at_sale,
  }))
}

export async function addProductToAppointmentByStaff(params: {
  tenantId:      string
  appointmentId: string
  productId:     string
  quantity:      number
}): Promise<{ success: boolean; alreadyExists?: boolean; error?: string }> {
  const { tenantId, appointmentId, productId, quantity } = params
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()

  // Verify appointment belongs to tenant and is not completed/cancelled
  const { data: appt } = await db
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!appt) return { success: false, error: 'Appuntamento non trovato.' }
  if (appt.status === 'completed') return { success: false, error: 'Appuntamento già completato.' }

  // Verify product belongs to tenant
  const { data: product } = await db
    .from('products')
    .select('id, price_sell')
    .eq('id', productId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (!product) return { success: false, error: 'Prodotto non trovato.' }

  // Prevent duplicate
  const { data: existing } = await db
    .from('appointment_products')
    .select('id')
    .eq('appointment_id', appointmentId)
    .eq('product_id', productId)
    .maybeSingle()
  if (existing) return { success: true, alreadyExists: true }

  const { error } = await db.from('appointment_products').insert({
    tenant_id:      tenantId,
    appointment_id: appointmentId,
    product_id:     productId,
    quantity,
    price_at_sale:  (product as { price_sell: number }).price_sell,
  })
  if (error) return { success: false, error: 'Errore nel salvataggio.' }
  return { success: true }
}

export async function removeAppointmentProduct(
  appointmentProductId: string,
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  await verifyUserTenantAccess(tenantId)
  const db = createAdminClient()
  const { error } = await db
    .from('appointment_products')
    .delete()
    .eq('id', appointmentProductId)
    .eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Cancel a completed appointment with explicit inventory choice ────────────

export async function cancelCompletedAppointment(
  appointmentId: string,
  notes: string | null,
  inventoryChoice: 'rollback' | 'keep',
): Promise<{ success: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { success: false, error: 'Non autenticato' }

  const db = createAdminClient()
  const { data: appt } = await db
    .from('appointments')
    .select('tenant_id, location_id, status')
    .eq('id', appointmentId)
    .maybeSingle()

  if (!appt || appt.tenant_id !== tenantId) return { success: false, error: 'Non autorizzato' }
  if ((appt as { status: string }).status !== 'completed') {
    return { success: false, error: 'Appuntamento non completato.' }
  }

  const { error } = await db
    .from('appointments')
    .update({ status: 'cancelled', notes })
    .eq('id', appointmentId)

  if (error) return { success: false, error: error.message }

  if (inventoryChoice === 'rollback' && (appt as { location_id: string | null }).location_id) {
    rollbackInventoryOnCancellation(
      appointmentId,
      tenantId,
      (appt as { location_id: string }).location_id,
    ).catch((err) => {
      console.error('[inventory] rollbackInventoryOnCancellation error:', err)
    })
  }

  return { success: true }
}

// ── Internal: inventory rollback on completed → cancelled ────────────────────

async function rollbackInventoryOnCancellation(
  appointmentId: string,
  tenantId:       string,
  locationId:     string,
): Promise<void> {
  const db = createAdminClient()

  const { data: items } = await db
    .from('appointment_products')
    .select('product_id, quantity')
    .eq('appointment_id', appointmentId)
    .eq('tenant_id', tenantId)

  if (!items?.length) return

  await Promise.all(
    (items as Array<{ product_id: string; quantity: number }>).map(async (item) => {
      const { data: inv } = await db
        .from('product_inventory')
        .select('id, quantity')
        .eq('product_id', item.product_id)
        .eq('location_id', locationId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (inv) {
        await db
          .from('product_inventory')
          .update({
            quantity: ((inv as { quantity: number }).quantity ?? 0) + item.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (inv as { id: string }).id)
      }

      // TODO: migration pending — 'inventory_movements' table not yet in DB schema.
      await db.from('inventory_movements').insert({
        tenant_id:      tenantId,
        product_id:     item.product_id,
        location_id:    locationId,
        appointment_id: appointmentId,
        movement_type:  'return',
        quantity:       item.quantity,
      })
    }),
  )
}

// ── Internal: inventory decrement on appointment completion ─────────────────

async function decrementInventoryOnCompletion(
  appointmentId: string,
  tenantId:       string,
  locationId:     string | null,
): Promise<void> {
  if (!locationId) return  // no location → no inventory row to decrement

  const db = createAdminClient()

  const { data: items } = await db
    .from('appointment_products')
    .select('product_id, quantity')
    .eq('appointment_id', appointmentId)
    .eq('tenant_id', tenantId)

  if (!items?.length) return

  await Promise.all(
    (items as Array<{ product_id: string; quantity: number }>).map(async (item) => {
      await Promise.all([
        db.rpc('decrement_product_inventory', {
          p_tenant_id:   tenantId,
          p_product_id:  item.product_id,
          p_location_id: locationId,
          p_quantity:    item.quantity,
        }),
        db.from('inventory_movements').insert({
          tenant_id:      tenantId,
          product_id:     item.product_id,
          location_id:    locationId,
          appointment_id: appointmentId,
          movement_type:  'sale',
          quantity:       -item.quantity,
        }),
      ])
    }),
  )
}

async function sendPostVisitNotifications(appointmentId: string, tenantId: string): Promise<void> {
  const db = createAdminClient()

  const { data: appt } = await db
    .from('appointments')
    .select('client_id')
    .eq('id', appointmentId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!appt?.client_id) return

  const [{ data: client }, { data: tenant }, postVisitEnabled, reviewEnabled] = await Promise.all([
    db.from('clients').select('email, full_name, profile_id, marketing_consent').eq('id', appt.client_id).maybeSingle(),
    db.from('tenants').select('business_name, primary_color, social_links').eq('id', tenantId).maybeSingle(),
    getAutomationEnabled(tenantId, 'post_visit_thanks'),
    getAutomationEnabled(tenantId, 'review_request'),
  ])

  if (!client?.marketing_consent) return

  const clientName   = client.full_name ?? 'Cliente'
  const clientEmail  = client.email ?? null
  const profileId    = client.profile_id ?? null
  const businessName = tenant?.business_name ?? 'il tuo salone'
  const primaryColor = tenant?.primary_color ?? '#111111'
  const tenantMeta   = { business_name: businessName, primary_color: primaryColor }

  // One channel determination covers both post_visit push and email
  const channel = !profileId
    ? (clientEmail ? 'email' : 'none')
    : await getNotificationChannel(profileId, tenantId).catch(
        () => (clientEmail ? 'email' : 'none') as 'push' | 'email' | 'none'
      )

  // Post-visit: push OR email (not both)
  if (postVisitEnabled) {
    if (channel === 'push' && profileId) {
      getSubscriptionsForProfile(tenantId, profileId).then((subs) => {
        if (subs.length > 0) {
          sendPushToSubscriptions(subs, {
            title: '🙏 Grazie per la tua visita!',
            body:  `Speriamo tu sia soddisfatto. A presto da ${businessName}!`,
            tag:   `post-visit-${appointmentId}`,
          }).catch(() => {})
        }
      }).catch(() => {})
    } else if (channel === 'email' && clientEmail) {
      await sendTemplatedEmail({
        to:           clientEmail,
        templateSlug: 'post_visit_thanks',
        variables:    { client_name: clientName, business_name: businessName },
        tenant:       tenantMeta,
        category:     'Grazie per la visita',
      })
    }
  }

  // Review request: email-only (no push equivalent) — send regardless of push channel
  if (reviewEnabled && clientEmail) {
    const socialLinks = tenant?.social_links as Record<string, string> | null
    const reviewUrl   = socialLinks?.google_reviews ?? ''
    if (reviewUrl) {
      await sendTemplatedEmail({
        to:           clientEmail,
        templateSlug: 'review_request',
        variables:    { client_name: clientName, business_name: businessName, review_url: reviewUrl },
        tenant:       tenantMeta,
        category:     'La tua opinione conta',
        ctaText:      'Lascia una recensione',
        ctaUrl:       reviewUrl,
      })
    }
  }
}

