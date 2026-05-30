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

  revalidatePath(`/tenant/app/${data.slug}`)
  revalidatePath(`/tenant/app/${data.slug}/prenota`)
  revalidatePath(`/tenant/app/${data.slug}/prenota/successo`)

  return {
    success: true,
    appointmentId,
  }
}
