'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractConsentRequestContext, seedClientConsentState } from '@/lib/consent-events'
import { CONSENT_ACTOR, CONSENT_SOURCE } from '@/lib/consent-copy'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getAvailableSlots } from '@/lib/actions/booking-slots'
import { getTenantTimezone } from '@/lib/actions/public-booking'
import { localDatetimeToUtc } from '@/lib/utils/timezone'
import { sendPushToSubscriptions, getSubscriptionsForProfile } from '@/lib/push/send-notification'
import { isPushConfigError } from '@/lib/push/config'
import { insertStaffNotification, abbrevName } from '@/lib/notifications'
import { buildClientFacingEmailTenantBranding, sendTemplatedEmail } from '@/lib/email'
import { getNotificationChannel } from '@/lib/notifications-channel'
import { buildTenantAppUrl } from '@/lib/auth/urls'
import type { TablesInsert } from '@/types'
import { getActiveOffersForBooking } from '@/lib/actions/offers'
import { applyBestPromotion } from '@/lib/utils/offer-pricing'
import {
  buildBookingConfirmationTokenExpiresAt,
  createBookingConfirmationToken,
  hashBookingConfirmationToken,
} from '@/lib/booking-confirmation-token'

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
  rescheduleFromId: z.string().uuid().optional(),
})

type ClientLookupRow = {
  id: string
  profile_id: string | null
}

export interface CreateGuestBookingResult {
  success: boolean
  appointmentId?: string
  clientId?: string
  error?: string
}

function sanitizePhone(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function buildBookingSuccessSearchParams(appointmentId: string, token: string): string {
  return new URLSearchParams({ appointment: appointmentId, token }).toString()
}

function buildBookingSuccessRelativePath(appointmentId: string, token: string): string {
  return `/prenota/successo?${buildBookingSuccessSearchParams(appointmentId, token)}`
}

function buildBookingSuccessAbsoluteUrl(slug: string, appointmentId: string, token: string): string {
  return buildTenantAppUrl(slug, `/prenota/successo?${buildBookingSuccessSearchParams(appointmentId, token)}`)
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

  // ── Lookup by profile_id for authenticated users (handles Google users with phone: null) ──
  let authUserId: string | null = null
  let existingClientId: string | null = null
  {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    authUserId = user?.id ?? null
    if (authUserId) {
      const { data: byProfile } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', data.tenantId)
        .eq('profile_id', authUserId)
        .is('deleted_at', null)
        .maybeSingle()
      if (byProfile) {
        existingClientId = (byProfile as { id: string }).id
        if (phone) {
          await db
            .from('clients')
            .update({ phone, updated_at: new Date().toISOString() })
            .eq('id', existingClientId)
            .is('phone', null)
        }
      }
    }
  }

  const [{ data: clientRow }, { data: serviceRows }] = await Promise.all([
    existingClientId
      ? db.from('clients').select('id, profile_id').eq('id', existingClientId).maybeSingle()
      : db
          .from('clients')
          .select('id, profile_id')
          .eq('tenant_id', data.tenantId)
          .eq('phone', phone)
          .is('deleted_at', null)
          .maybeSingle(),
    db
      .from('services')
      .select('id, name, price, duration_minutes')
      .eq('tenant_id', data.tenantId)
      .eq('is_active', true)
      .in('id', data.serviceIds),
  ])

  const matchedClient = (clientRow as ClientLookupRow | null) ?? null
  const services = (serviceRows ?? []) as Array<{
    id: string
    name: string
    price: number
    duration_minutes: number
  }>

  if (services.length !== data.serviceIds.length) {
    return {
      success: false,
      error: 'Uno o più servizi selezionati non sono disponibili.',
    }
  }

  let clientId = matchedClient?.id ?? null
  if (clientId && authUserId) {
    const matchedProfileId = matchedClient?.profile_id ?? null

    if (matchedProfileId === null) {
      const { error: linkClientError } = await db
        .from('clients')
        .update({
          profile_id: authUserId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clientId)
        .is('profile_id', null)

      if (linkClientError) {
        return {
          success: false,
          error: linkClientError.message,
        }
      }
    } else if (matchedProfileId !== authUserId) {
      clientId = null
    }
  }

  const isNewClient = clientId === null

  if (!clientId) {
    const clientPayload: TablesInsert<'clients'> = {
      tenant_id: data.tenantId,
      profile_id: authUserId,
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

    try {
      const requestContext = extractConsentRequestContext(await headers())
      await seedClientConsentState(db, {
        tenantId: data.tenantId,
        clientId,
        marketingAllowed: Boolean(data.marketingConsent),
        churnAllowed: true,
        actor: authUserId ? CONSENT_ACTOR.CLIENT_PROFILE : CONSENT_ACTOR.GUEST_SUBMISSION,
        actorProfileId: authUserId ?? null,
        source: CONSENT_SOURCE.GUEST_BOOKING,
        occurredAt: new Date().toISOString(),
        ipAddress: requestContext.ipAddress ?? null,
        userAgent: requestContext.userAgent ?? null,
        metadata: {
          surface: 'guest_booking',
        },
      })
    } catch (error) {
      await db.from('clients').delete().eq('id', clientId).eq('tenant_id', data.tenantId)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Impossibile creare il profilo cliente.',
      }
    }
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

  const bookingConfirmationToken = createBookingConfirmationToken()
  const bookingConfirmationTokenHash = hashBookingConfirmationToken(bookingConfirmationToken)
  const bookingConfirmationTokenExpiresAt = buildBookingConfirmationTokenExpiresAt()

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
    booking_confirmation_token_hash: bookingConfirmationTokenHash,
    booking_confirmation_token_expires_at: bookingConfirmationTokenExpiresAt,
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

  // Resolve best promotion per service — uses existing clientId (may be freshly inserted for new clients)
  const promotionsMap: Record<string, import('@/lib/utils/offer-pricing').PromotionServicePricing[]> = await getActiveOffersForBooking(
    data.tenantId,
    services.map((s) => s.id),
    clientId,
  ).catch(() => ({}))

  const appointmentServicePayload = services.map((service) => {
    const basePrice = Number(service.price ?? 0)
    const items = promotionsMap[service.id] ?? []
    const { discountedPrice, appliedPromotionId } = applyBestPromotion(basePrice, items)
    return {
      tenant_id: data.tenantId,
      appointment_id: appointmentId,
      service_id: service.id,
      price_at_booking: discountedPrice,
      ...(appliedPromotionId ? { applied_promotion_id: appliedPromotionId } : {}),
    }
  })

  const { error: appointmentServicesError } = await (db as any)
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
      const { error: prodError } = await db.from('appointment_products').insert(productPayload)
      if (prodError) {
        console.error('[createGuestBooking] appointment_products insert failed:', prodError.message, { appointmentId, productIds: data.productIds })
      }
    }
  }

  revalidatePath(`/tenant/app/${data.slug}`)
  revalidatePath(`/tenant/app/${data.slug}/prenota`)
  revalidatePath(`/tenant/app/${data.slug}/prenota/successo`)

  // ── Notifiche staff (in-app + push) ──────────────────────────────────────
  const notifTime = startDate.toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
  })
  const notifDate = startDate.toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome',
  })

  if (data.rescheduleFromId) {
    // Path B reschedule: fetch vecchio orario + notifica awaited
    const oldId = data.rescheduleFromId
    await (async () => {
      const { data: oldAppt } = await db
        .from('appointments')
        .select('start_time')
        .eq('id', oldId)
        .eq('tenant_id', data.tenantId)
        .maybeSingle()
      const oldStart = (oldAppt as { start_time: string } | null)?.start_time
      const oldTimeStr = oldStart
        ? new Date(oldStart).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
        : '??:??'
      const oldDateStr = oldStart
        ? new Date(oldStart).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
        : ''
      await insertStaffNotification({
        tenantId: data.tenantId,
        type: 'reschedule',
        title: 'Appuntamento spostato',
        body: `${abbrevName(data.fullName)} — da ${oldDateStr} alle ${oldTimeStr} → ${notifDate} alle ${notifTime}`,
        meta: { appointment_id: appointmentId, old_appointment_id: oldId, client_id: clientId },
      })
    })().catch((err) => {
      console.error('[notifications] reschedule notification failed:', err)
    })
  } else {
    if (isNewClient) {
      await insertStaffNotification({
        tenantId: data.tenantId,
        type: 'new_client',
        title: 'Nuovo cliente',
        body: `${data.fullName} si è appena registrato`,
        meta: { client_id: clientId },
      })
    }

    await insertStaffNotification({
      tenantId: data.tenantId,
      type: 'new_booking',
      title: 'Nuova prenotazione',
      body: `${abbrevName(data.fullName)} — ${services.map((s) => s.name).join(' + ')}, ${notifDate} alle ${notifTime}`,
      meta: { appointment_id: appointmentId, client_id: clientId },
    })
  }

  // ── Fire-and-forget: conferma prenotazione al cliente (push O email, mai entrambe)
  sendBookingConfirmedNotification({
    tenantId:     data.tenantId,
    slug:         data.slug,
    appointmentId,
    bookingConfirmationToken,
    clientId,
    staffId:      data.staffId,
    startTime:    startDate.toISOString(),
    serviceNames: services.map((s) => s.name),
  }).catch((err) => {
    console.error('[booking-confirmed] notification error:', err)
  })

  return {
    success: true,
    appointmentId,
    clientId,
  }
}

async function sendBookingConfirmedNotification(params: {
  tenantId:      string
  slug:          string
  appointmentId: string
  bookingConfirmationToken: string
  clientId:      string
  staffId:       string
  startTime:     string
  serviceNames:  string[]
}): Promise<void> {
  const db = createAdminClient()

  const [{ data: clientRow }, { data: staffRow }, { data: tenantRow }] = await Promise.all([
    db.from('clients').select('profile_id, full_name, email').eq('id', params.clientId).maybeSingle(),
    db.from('staff_members').select('profiles(full_name)').eq('id', params.staffId).maybeSingle(),
    db.from('tenants').select('business_name, primary_color').eq('id', params.tenantId).maybeSingle(),
  ])

  const profileId    = clientRow?.profile_id ?? null
  const clientEmail  = clientRow?.email ?? null
  const clientName   = clientRow?.full_name ?? 'Cliente'
  const staffName    = (staffRow?.profiles as unknown as { full_name: string | null } | null)?.full_name ?? 'il tuo barbiere'
  const businessName = tenantRow?.business_name ?? 'il tuo salone'
  const primaryColor = tenantRow?.primary_color ?? '#111111'

  const channel = !profileId
    ? (clientEmail ? 'email' : 'none')
    : await getNotificationChannel(profileId, params.tenantId).catch((error: unknown) => {
        if (isPushConfigError(error)) throw error
        return (clientEmail ? 'email' : 'none') as 'push' | 'email' | 'none'
      })

  const date = new Date(params.startTime).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
  const time = new Date(params.startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  const successRelativePath = buildBookingSuccessRelativePath(
    params.appointmentId,
    params.bookingConfirmationToken,
  )
  const successAbsoluteUrl = buildBookingSuccessAbsoluteUrl(
    params.slug,
    params.appointmentId,
    params.bookingConfirmationToken,
  )

  if (channel === 'push' && profileId) {
    const subs = await getSubscriptionsForProfile(params.tenantId, profileId)
    if (subs.length > 0) {
      await sendPushToSubscriptions(subs, {
        title: '✅ Prenotazione confermata!',
        body:  `${date} alle ${time} da ${businessName}`,
        url:   successRelativePath,
        tag:   `booking-confirmed-${params.appointmentId}`,
      })
      await db.from('notification_log').upsert(
        { tenant_id: params.tenantId, profile_id: profileId, appointment_id: params.appointmentId, type: 'booking_confirmed' },
        { onConflict: 'appointment_id,type' }
      )
      const { error: notifErr } = await db.from('notifications').insert({
        tenant_id: params.tenantId,
        profile_id: profileId,
        type: 'booking_confirmed',
        title: '✅ Prenotazione confermata!',
        body: `${date} alle ${time} da ${businessName}`,
        is_read: false,
        meta: { url: successRelativePath, appointment_id: params.appointmentId },
      })
      if (notifErr) console.error('[booking-confirmed] notifications insert failed:', notifErr.message)
    }
  } else if (channel === 'email' && clientEmail) {
    await sendTemplatedEmail({
      to:           clientEmail,
      templateSlug: 'booking_confirmed',
      variables:    {
        client_name: clientName,
        staff_name: staffName,
        date,
        time,
        services: params.serviceNames.join(', '),
        confirmation_url: successAbsoluteUrl,
      },
      tenant:       buildClientFacingEmailTenantBranding({
        business_name: businessName,
        primary_color: primaryColor,
        slug: params.slug,
      }),
      category:     'Prenotazione confermata',
      details:      { Data: date, Orario: time, Servizi: params.serviceNames.join(', '), Con: staffName },
      ctaText:      'Vedi prenotazione',
      ctaUrl:       successAbsoluteUrl,
    })
  }
}
