'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  applyClientConsentEvents,
  buildChurnProfilingEvent,
  buildMarketingConsentEvents,
  extractConsentRequestContext,
} from '@/lib/consent-events'
import {
  CLIENT_PRIVACY_REQUEST_ACTION,
  CLIENT_PRIVACY_REQUEST_STATUS,
  recordClientPrivacyRequest,
} from '@/lib/client-privacy-rights'
import { CONSENT_ACTOR, CONSENT_CHANNEL, CONSENT_SOURCE } from '@/lib/consent-copy'
import { createClient } from '@/lib/supabase/server'
import { localDatetimeToUtc } from '@/lib/utils/timezone'
import { insertStaffNotification, abbrevName } from '@/lib/notifications'
import type { TablesUpdate } from '@/types'

async function getAuthenticatedClientId(tenantId: string): Promise<{ clientId: string; userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  if (!client) return null
  return { clientId: (client as { id: string }).id, userId: user.id }
}

export async function cancelClientAppointment(
  tenantId: string,
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()

    // Verify this appointment belongs to this client
    const { data: apt } = await db
      .from('appointments')
      .select('id, status, start_time, client_id, clients(full_name)')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .eq('client_id', ctx.clientId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!apt) return { ok: false, error: 'Appuntamento non trovato' }
    if (!['confirmed', 'pending'].includes(apt.status)) {
      return { ok: false, error: 'Appuntamento non cancellabile' }
    }
    if (new Date(apt.start_time) <= new Date()) {
      return { ok: false, error: 'Impossibile cancellare un appuntamento già passato' }
    }

    const { error } = await db
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)

    if (error) return { ok: false, error: error.message }

    // Notifica cancellazione per lo staff (awaited)
    const aptTyped = apt as unknown as {
      start_time: string
      client_id: string
      clients: { full_name: string | null } | null
    }
    const cancelTime = new Date(aptTyped.start_time).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
    })
    const cancelDate = new Date(aptTyped.start_time).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome',
    })
    await insertStaffNotification({
      tenantId,
      type: 'cancellation',
      title: 'Appuntamento cancellato',
      body: `${aptTyped.clients?.full_name ?? 'Cliente'} ha cancellato — ${cancelDate} alle ${cancelTime}`,
      meta: { appointment_id: appointmentId, client_id: aptTyped.client_id },
    })

    revalidatePath(`/tenant/app`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function rescheduleClientAppointment(
  tenantId: string,
  appointmentId: string,
  date: string,
  time: string,
): Promise<{ ok: true; newStartTime: string } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()

    // Verify ownership, status, and that the appointment is in the future
    const { data: apt } = await db
      .from('appointments')
      .select('id, status, start_time, staff_id, appointment_services(service_id), clients(full_name)')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .eq('client_id', ctx.clientId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!apt) return { ok: false, error: 'Appuntamento non trovato' }

    const typedApt = apt as unknown as {
      id: string
      status: string
      start_time: string
      staff_id: string
      appointment_services: Array<{ service_id: string }>
      clients: { full_name: string | null } | null
    }

    if (!['confirmed', 'pending'].includes(typedApt.status)) {
      return { ok: false, error: 'Appuntamento non modificabile' }
    }
    if (new Date(typedApt.start_time) <= new Date()) {
      return { ok: false, error: 'Impossibile modificare un appuntamento già passato' }
    }

    // Get tenant timezone and service durations
    const serviceIds = typedApt.appointment_services.map((s) => s.service_id)

    const [{ data: tenantRow }, { data: serviceRows }] = await Promise.all([
      db.from('tenants').select('timezone').eq('id', tenantId).maybeSingle(),
      serviceIds.length > 0
        ? db.from('services').select('duration_minutes').eq('tenant_id', tenantId).in('id', serviceIds)
        : Promise.resolve({ data: [] }),
    ])

    const timezone = (tenantRow as { timezone?: string | null } | null)?.timezone ?? 'Europe/Rome'
    const totalMinutes =
      ((serviceRows ?? []) as Array<{ duration_minutes: number }>).reduce(
        (sum, s) => sum + Number(s.duration_minutes ?? 30),
        0,
      ) || 30

    const newStart = localDatetimeToUtc(date, time, timezone)
    const newEnd = new Date(newStart.getTime() + totalMinutes * 60_000)
    const newStartTime = newStart.toISOString()
    const newEndTime = newEnd.toISOString()

    // Server-side conflict check — exclude the appointment being rescheduled
    const { data: conflicts } = await db
      .from('appointments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('staff_id', typedApt.staff_id)
      .is('deleted_at', null)
      .neq('id', appointmentId)
      .neq('status', 'cancelled')
      .neq('status', 'no_show')
      .lt('start_time', newEndTime)
      .gt('end_time', newStartTime)

    if ((conflicts ?? []).length > 0) {
      return {
        ok: false,
        error: 'Lo slot selezionato non è più disponibile. Scegli un altro orario.',
      }
    }

    const { error } = await db
      .from('appointments')
      .update({
        start_time: newStartTime,
        end_time: newEndTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)

    if (error) return { ok: false, error: error.message }

    // Notifica reschedule per lo staff (awaited)
    const oldTime = new Date(typedApt.start_time).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
    })
    const oldDate = new Date(typedApt.start_time).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome',
    })
    const newTime = new Date(newStartTime).toLocaleTimeString('it-IT', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome',
    })
    const newDate = new Date(newStartTime).toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome',
    })
    await insertStaffNotification({
      tenantId,
      type: 'reschedule',
      title: 'Appuntamento spostato',
      body: `${abbrevName(typedApt.clients?.full_name ?? 'Cliente')} — da ${oldDate} alle ${oldTime} → ${newDate} alle ${newTime}`,
      meta: { appointment_id: appointmentId },
    })

    revalidatePath(`/tenant/app`)
    return { ok: true, newStartTime }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore imprevisto' }
  }
}

export async function cancelAppointmentForReschedule(
  tenantId: string,
  appointmentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()

    const { data: apt } = await db
      .from('appointments')
      .select('id, status, client_id')
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)
      .eq('client_id', ctx.clientId)
      .is('deleted_at', null)
      .maybeSingle()

    if (!apt) return { ok: false, error: 'Appuntamento non trovato' }
    if (!['confirmed', 'pending'].includes((apt as { id: string; status: string; client_id: string }).status)) {
      return { ok: false, error: 'Appuntamento non cancellabile' }
    }

    const { error } = await db
      .from('appointments')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', appointmentId)
      .eq('tenant_id', tenantId)

    if (error) return { ok: false, error: error.message }

    revalidatePath(`/tenant/app`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateClientProfileData(
  tenantId: string,
  data: {
    fullName?: string
    phone?: string | null
    dateOfBirth?: string | null
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const now = new Date().toISOString()

    const updates: TablesUpdate<'clients'> = { updated_at: now }
    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.phone !== undefined) updates.phone = data.phone
    if (data.dateOfBirth !== undefined) updates.date_of_birth = data.dateOfBirth || null

    // Update profiles table
    const profileUpdates: TablesUpdate<'profiles'> = { updated_at: now }
    if (data.fullName !== undefined) profileUpdates.full_name = data.fullName
    if (data.phone !== undefined) profileUpdates.phone = data.phone

    const changedFields = [
      data.fullName !== undefined ? 'full_name' : null,
      data.phone !== undefined ? 'phone' : null,
      data.dateOfBirth !== undefined ? 'date_of_birth' : null,
    ].filter((field): field is string => Boolean(field))

    await Promise.all([
      db.from('clients').update(updates).eq('id', ctx.clientId).eq('tenant_id', tenantId).is('deleted_at', null),
      db.from('profiles').update(profileUpdates).eq('id', ctx.userId),
    ])

    if (changedFields.length > 0) {
      try {
        await recordClientPrivacyRequest({
          action: CLIENT_PRIVACY_REQUEST_ACTION.RECTIFICATION,
          clientId: ctx.clientId,
          details: {
            changed_fields: changedFields,
          },
          profileId: ctx.userId,
          status: CLIENT_PRIVACY_REQUEST_STATUS.COMPLETED,
          tenantId,
        })
      } catch (error) {
        console.error('[pwa-client-actions] rectification audit failed:', error)
      }
    }

    revalidatePath(`/tenant/app`)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateNotificationPreferences(
  preferences: Record<string, boolean>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const { data: profile } = await db
      .from('profiles')
      .select('notification_preferences')
      .eq('id', user.id)
      .maybeSingle()

    const current = (profile?.notification_preferences as Record<string, boolean>) ?? {}
    const merged = { ...current, ...preferences }

    const { error } = await db
      .from('profiles')
      .update({ notification_preferences: merged, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateMarketingConsent(
  tenantId: string,
  consent: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const requestContext = extractConsentRequestContext(await headers())
    await applyClientConsentEvents(db, {
      tenantId,
      clientId: ctx.clientId,
      actor: CONSENT_ACTOR.CLIENT_PROFILE,
      actorProfileId: ctx.userId,
      source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
      events: buildMarketingConsentEvents({
        allowed: consent,
        channel: CONSENT_CHANNEL.PWA,
        source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
        occurredAt: new Date().toISOString(),
        ipAddress: requestContext.ipAddress ?? null,
        metadata: {
          surface: 'pwa_profile_preferences',
        },
        userAgent: requestContext.userAgent ?? null,
      }).map((event) => ({
        ...event,
        metadata: {
          ...(event.metadata ?? {}),
          ip_address: requestContext.ipAddress ?? null,
          user_agent: requestContext.userAgent ?? null,
        },
      })),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}

export async function updateChurnProfilingConsent(
  tenantId: string,
  objected: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const ctx = await getAuthenticatedClientId(tenantId)
    if (!ctx) return { ok: false, error: 'Non autenticato' }

    const db = createAdminClient()
    const requestContext = extractConsentRequestContext(await headers())
    await applyClientConsentEvents(db, {
      tenantId,
      clientId: ctx.clientId,
      actor: CONSENT_ACTOR.CLIENT_PROFILE,
      actorProfileId: ctx.userId,
      source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
      events: [
        {
          ...buildChurnProfilingEvent({
            allowed: !objected,
            channel: CONSENT_CHANNEL.PWA,
            source: CONSENT_SOURCE.PWA_PROFILE_PREFERENCES,
            occurredAt: new Date().toISOString(),
            ipAddress: requestContext.ipAddress ?? null,
            metadata: {
              surface: 'pwa_profile_preferences',
            },
            userAgent: requestContext.userAgent ?? null,
          }),
          metadata: {
            surface: 'pwa_profile_preferences',
            ip_address: requestContext.ipAddress ?? null,
            user_agent: requestContext.userAgent ?? null,
          },
        },
      ],
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Errore' }
  }
}
