/**
 * POST /api/cron/reminders
 *
 * Trova appuntamenti nelle finestre 3gg / 1gg / stesso giorno e invia
 * il reminder via push (se attiva) oppure email (fallback) — mai entrambi.
 *
 * Sicurezza: richiede header Authorization: Bearer <CRON_SECRET>
 * Idempotenza: notification_log con UNIQUE (appointment_id, type) — un'unica
 * riga per finestra reminder indipendentemente dal canale usato.
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{ "path": "/api/cron/reminders", "schedule": "0 7 * * *" }]
 * }
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions, getSubscriptionsForProfile } from '@/lib/push/send-notification'
import type { PushPayload } from '@/lib/push/send-notification'
import { isPushConfigError } from '@/lib/push/config'
import { buildClientFacingEmailTenantBranding, sendTemplatedEmail } from '@/lib/email'
import { getAutomationEnabled } from '@/lib/actions/marketing-automations'
import { getNotificationChannel } from '@/lib/notifications-channel'

type ReminderType = 'reminder_3d' | 'reminder_1d' | 'reminder_day'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

interface NotificationLogRow {
  appointment_id: string | null
}

interface RawAppointmentRow {
  id:         string
  start_time: string
  tenant_id:  string
  clients: {
    profile_id: string | null
    full_name:  string | null
    email:      string | null
  } | null
  tenants: {
    business_name: string
    slug:          string
    primary_color: string | null
  } | null
  staff_members: {
    profiles: { full_name: string | null } | null
  } | null
}

function buildPushPayload(type: ReminderType, businessName: string, startTime: string, url: string): PushPayload {
  const time = new Date(startTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
  const date = new Date(startTime).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
  switch (type) {
    case 'reminder_3d':  return { title: `📅 Appuntamento tra 3 giorni`,    body: `Ti aspettiamo da ${businessName} ${date} alle ${time}`, url, tag: `reminder-3d-${url}` }
    case 'reminder_1d':  return { title: `⏰ Domani hai un appuntamento!`,   body: `Ricorda: da ${businessName} ${date} alle ${time}`, url, tag: `reminder-1d-${url}` }
    case 'reminder_day': return { title: `✂️ Oggi hai un appuntamento alle ${time}!`, body: `Ti aspettiamo da ${businessName}`, url, tag: `reminder-day-${url}` }
  }
}

function getTimeRange(type: ReminderType): { from: string; to: string } {
  const now = new Date()
  const DAY = 24 * 60 * 60 * 1000
  const offsets: Record<ReminderType, number> = { reminder_3d: 3, reminder_1d: 1, reminder_day: 0 }
  const target = new Date(now.getTime() + offsets[type] * DAY)
  const from = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 0, 0, 0, 0))
  const to   = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate(), 23, 59, 59, 999))
  return { from: from.toISOString(), to: to.toISOString() }
}

function isUuid(value: string | null | undefined): value is string {
  return !!value && UUID_RE.test(value)
}

async function processReminderWindow(
  type: ReminderType,
): Promise<{ processed: number; pushSent: number; emailSent: number }> {
  const db    = createAdminClient()
  const range = getTimeRange(type)

  const { data: notifiedRows, error: notifiedError } = await db
    .from('notification_log')
    .select('appointment_id')
    .in('type', [type, `${type}_email`])
    .not('appointment_id', 'is', null)

  if (notifiedError) {
    console.error('[cron/reminders] notification_log query error', {
      type,
      message: notifiedError.message,
      code: notifiedError.code,
    })
    throw new Error(`notification_log query failed for ${type}`)
  }

  const notifiedAppointmentIds = ((notifiedRows ?? []) as NotificationLogRow[])
    .map((row) => row.appointment_id)
    .filter(isUuid)

  // Exclude appointments already notified via ANY channel (old _email types included for migration safety)
  let appointmentsQuery = db
    .from('appointments')
    .select(
      `id, start_time, tenant_id,
       clients(profile_id, full_name, email),
       tenants(business_name, slug, primary_color),
       staff_members(profiles(full_name))`
    )
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('start_time', range.from)
    .lte('start_time', range.to)

  if (notifiedAppointmentIds.length > 0) {
    appointmentsQuery = appointmentsQuery.not(
      'id',
      'in',
      `(${notifiedAppointmentIds.join(',')})`
    )
  }

  const { data: appointments, error: appointmentsError } = await appointmentsQuery

  if (appointmentsError) {
    console.error('[cron/reminders] appointments query error', {
      type,
      range,
      notifiedCount: notifiedAppointmentIds.length,
      message: appointmentsError.message,
      code: appointmentsError.code,
    })
    throw new Error(`appointments query failed for ${type}`)
  }

  const rows = ((appointments ?? []) as unknown as RawAppointmentRow[])
  let pushSent  = 0
  let emailSent = 0
  const tenantEnabledCache = new Map<string, boolean>()

  for (const appt of rows) {
    // Per-tenant automation check (cached)
    if (!tenantEnabledCache.has(appt.tenant_id)) {
      tenantEnabledCache.set(appt.tenant_id, await getAutomationEnabled(appt.tenant_id, 'reminder_1d'))
    }
    if (!tenantEnabledCache.get(appt.tenant_id)) continue

    const profileId    = appt.clients?.profile_id ?? null
    const clientEmail  = appt.clients?.email ?? null
    const clientName   = appt.clients?.full_name ?? 'Cliente'
    const staffName    = (appt.staff_members?.profiles as unknown as { full_name: string | null } | null)?.full_name ?? 'il tuo barbiere'
    const businessName = appt.tenants?.business_name ?? 'il tuo salone'
    const primaryColor = appt.tenants?.primary_color ?? '#111111'
    const slug         = appt.tenants?.slug ?? ''
    const url          = '/appuntamenti'

    // Determine channel — guest clients (no profile) get email directly
    let channel: 'push' | 'email' | 'none'
    if (!profileId) {
      channel = clientEmail ? 'email' : 'none'
    } else {
      channel = await getNotificationChannel(profileId, appt.tenant_id).catch(
        (error: unknown) => {
          if (isPushConfigError(error)) throw error
          return (clientEmail ? 'email' : 'none') as 'push' | 'email' | 'none'
        }
      )
    }

    let notifSent = false

    if (channel === 'push' && profileId) {
      const subs = await getSubscriptionsForProfile(appt.tenant_id, profileId)
      if (subs.length > 0) {
        const pushPayload = buildPushPayload(type, businessName, appt.start_time, url)
        const sent = await sendPushToSubscriptions(subs, pushPayload)
        if (sent > 0) {
          pushSent++
          notifSent = true
          const { error: notifErr } = await db.from('notifications').insert({
            tenant_id: appt.tenant_id,
            profile_id: profileId,
            type,
            title: pushPayload.title,
            body: pushPayload.body ?? null,
            is_read: false,
            meta: { url, appointment_id: appt.id },
          })
          if (notifErr) console.error('[cron/reminders] notifications insert failed:', notifErr.message)
        }
      }
    } else if (channel === 'email' && clientEmail) {
      const date = new Date(appt.start_time).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Rome' })
      const time = new Date(appt.start_time).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })
      const result = await sendTemplatedEmail({
        to:           clientEmail,
        templateSlug: 'reminder',
        variables:    { client_name: clientName, date, time, staff_name: staffName },
        tenant:       buildClientFacingEmailTenantBranding({
          business_name: businessName,
          primary_color: primaryColor,
          slug,
        }),
        category:     'Promemoria appuntamento',
        details:      { Data: date, Orario: time, Con: staffName },
      })
      if (result.success) { emailSent++; notifSent = true }
    }

    if (notifSent) {
      await db.from('notification_log').upsert(
        { tenant_id: appt.tenant_id, profile_id: profileId, appointment_id: appt.id, type },
        { onConflict: 'appointment_id,type' }
      )
    }
  }

  return { processed: rows.length, pushSent, emailSent }
}

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/reminders] CRON_SECRET non configurato')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [r3d, r1d, rDay] = await Promise.all([
      processReminderWindow('reminder_3d'),
      processReminderWindow('reminder_1d'),
      processReminderWindow('reminder_day'),
    ])

    const summary = {
      reminder_3d:    r3d,
      reminder_1d:    r1d,
      reminder_day:   rDay,
      totalPushSent:  r3d.pushSent  + r1d.pushSent  + rDay.pushSent,
      totalEmailSent: r3d.emailSent + r1d.emailSent + rDay.emailSent,
    }

    console.info('[cron/reminders]', JSON.stringify(summary))
    return NextResponse.json(summary)
  } catch (error) {
    console.error('[cron/reminders] processing failed', error)
    return NextResponse.json({ error: 'Reminder processing failed' }, { status: 500 })
  }
}

// Vercel Cron always calls GET — delegate to the same handler as POST.
export async function GET(req: NextRequest) {
  return POST(req)
}
