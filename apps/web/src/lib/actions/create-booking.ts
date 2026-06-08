'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAvailableSlots } from '@/lib/actions/booking-slots'
import { getTenantTimezone } from '@/lib/actions/public-booking'
import { localDatetimeToUtc } from '@/lib/utils/timezone'
import type { TablesInsert } from '@/types'

const createGuestBookingSchema = z.object({
  slug: z.string().min(1),
  tenantId: z.string().min(1),
  locationId: z.string().min(1),
  staffId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  fullName: z.string().trim().min(2, 'Inserisci il tuo nome e cognome.'),
  phone: z.string().trim().min(6, 'Inserisci un numero di telefono valido.'),
  email: z
    .string()
    .trim()
    .optional()
    .transform((value) => value ?? '')
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Inserisci un indirizzo email valido.',
    }),
  notes: z.string().trim().max(500).optional().transform((value) => value ?? ''),
  marketingConsent: z.boolean().default(false),
  productIds: z.array(z.string().min(1)).optional().default([]),
})

export interface CreateGuestBookingResult {
  success: boolean
  appointmentId?: string
  error?: string
}

function sanitizePhone(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function buildAppointmentDate(date: string, time: string, timezone: string = 'Europe/Rome'): Date {
  return localDatetimeToUtc(date, time, timezone)
}

export async function createGuestBooking(
  input: z.infer<typeof createGuestBookingSchema>
): Promise<CreateGuestBookingResult> {
  const parsed = createGuestBookingSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Dati non validi.',
    }
  }

  const data = parsed.data
  const phone = sanitizePhone(data.phone)
  const email = data.email || null
  const notes = data.notes || null
  const db = createAdminClient()

  // ── P0: verify slug ↔ tenantId and that referenced resources belong to this tenant ──
  const [{ data: tenantRow }, { data: staffRow }, { data: locationRow }] = await Promise.all([
    db
      .from('tenants')
      .select('id')
      .eq('slug', data.slug)
      .eq('id', data.tenantId)
      .eq('status', 'active')
      .maybeSingle(),
    db
      .from('staff_members')
      .select('id')
      .eq('id', data.staffId)
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('locations')
      .select('id')
      .eq('id', data.locationId)
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .maybeSingle(),
  ])

  if (!tenantRow) {
    return { success: false, error: 'Tenant non valido.' }
  }
  if (!staffRow) {
    return { success: false, error: 'Barbiere non valido.' }
  }
  if (!locationRow) {
    return { success: false, error: 'Sede non valida.' }
  }
  // ── end P0 ──

  // ── P1: rate limiting per numero di telefono ──────────────────────────────
  // Cerca il cliente esistente con questo telefono nel tenant
  const { data: existingClientForRateLimit } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', data.tenantId)
    .eq('phone', phone)
    .is('deleted_at', null)
    .maybeSingle()

  if (existingClientForRateLimit) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count } = await db
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', data.tenantId)
      .eq('client_id', existingClientForRateLimit.id)
      .neq('status', 'cancelled')
      .is('deleted_at', null)
      .gte('created_at', oneHourAgo)

    if ((count ?? 0) >= 3) {
      return {
        success: false,
        error: 'Hai già effettuato troppe prenotazioni di recente. Riprova tra qualche ora.',
      }
    }
  }
  // ── end P1 ──

  const timezone = await getTenantTimezone(data.tenantId)

  const availableSlots = await getAvailableSlots({
    tenantId: data.tenantId,
    staffId: data.staffId,
    serviceIds: data.serviceIds,
    date: data.date,
    timezone,
  })

  const slotStillAvailable = availableSlots.slots.some((slot) => slot.time === data.time)
  if (!slotStillAvailable) {
    return {
      success: false,
      error: 'Questo orario non è più disponibile. Scegline un altro.',
    }
  }

  const [{ data: clientRow }, { data: serviceRows }] = await Promise.all([
    db
      .from('clients')
      .select('id')
      .eq('tenant_id', data.tenantId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .maybeSingle(),
    db
      .from('services')
      .select('id, price, duration_minutes')
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .in('id', data.serviceIds),
  ])

  const services = (serviceRows ?? []) as Array<{
    id: string
    price: number
    duration_minutes: number
  }>

  if (services.length !== data.serviceIds.length) {
    return {
      success: false,
      error: 'Uno o più servizi selezionati non sono disponibili.',
    }
  }

  let clientId = (clientRow as { id: string } | null)?.id ?? null

  if (!clientId) {
    const clientPayload: TablesInsert<'clients'> = {
      tenant_id: data.tenantId,
      full_name: data.fullName,
      phone,
      email,
      marketing_consent: data.marketingConsent,
      preferred_contact_channel: 'whatsapp',
      tags: '["active"]',
    }

    const { data: insertedClient, error: clientError } = await db
      .from('clients')
      .insert(clientPayload)
      .select('id')
      .single()

    if (clientError || !insertedClient) {
      return {
        success: false,
        error: clientError?.message ?? 'Impossibile creare il profilo cliente.',
      }
    }

    clientId = (insertedClient as { id: string }).id
  }

  const totalMinutes = services.reduce(
    (total, service) => total + Number(service.duration_minutes ?? 0),
    0
  )
  const startDate = buildAppointmentDate(data.date, data.time, timezone)

  if (Number.isNaN(startDate.getTime())) {
    return {
      success: false,
      error: 'Data o orario non validi.',
    }
  }

  const endDate = new Date(startDate)
  endDate.setMinutes(endDate.getMinutes() + totalMinutes)

  const appointmentPayload: TablesInsert<'appointments'> = {
    tenant_id: data.tenantId,
    client_id: clientId,
    staff_id: data.staffId,
    location_id: data.locationId,
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    status: 'confirmed',
    booking_source: 'pwa',
    notes,
  }

  const { data: appointmentRow, error: appointmentError } = await db
    .from('appointments')
    .insert(appointmentPayload)
    .select('id')
    .single()

  if (appointmentError || !appointmentRow) {
    if (appointmentError?.code === '23P01') {
      return {
        success: false,
        error: 'Lo slot selezionato non è più disponibile. Scegli un altro orario.',
      }
    }

    return {
      success: false,
      error: appointmentError?.message ?? 'Errore durante la creazione della prenotazione.',
    }
  }

  const appointmentId = (appointmentRow as { id: string }).id
  const appointmentServicePayload: Array<TablesInsert<'appointment_services'>> = services.map((service) => ({
    tenant_id: data.tenantId,
    appointment_id: appointmentId,
    service_id: service.id,
    price_at_booking: Number(service.price ?? 0),
  }))

  const { error: appointmentServicesError } = await db
    .from('appointment_services')
    .insert(appointmentServicePayload)

  if (appointmentServicesError) {
    await db.from('appointments').delete().eq('id', appointmentId)

    return {
      success: false,
      error: appointmentServicesError.message,
    }
  }

  if (data.productIds.length > 0) {
    const { data: productRows } = await db
      .from('products')
      .select('id, price_sell')
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .in('id', data.productIds)

    const productPayload = ((productRows ?? []) as Array<{ id: string; price_sell: number }>).map(
      (p) => ({
        tenant_id: data.tenantId,
        appointment_id: appointmentId,
        product_id: p.id,
        quantity: 1,
        price_at_sale: Number(p.price_sell ?? 0),
      }),
    )

    if (productPayload.length > 0) {
      await db.from('appointment_products').insert(productPayload)
    }
  }

  revalidatePath(`/tenant/app/${data.slug}`)
  revalidatePath(`/tenant/app/${data.slug}/prenota`)
  revalidatePath(`/tenant/app/${data.slug}/prenota/successo`)

  return {
    success: true,
    appointmentId,
  }
}
