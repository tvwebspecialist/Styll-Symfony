/**
 * POST /api/cron/reminders
 *
 * Endpoint da invocare ogni 15 minuti via Vercel Cron o scheduler esterno.
 * Trova appuntamenti nelle finestre 3gg / 1gg / stesso giorno e invia
 * notifiche push ai clienti che hanno una subscription attiva.
 *
 * Sicurezza: richiede header Authorization: Bearer <CRON_SECRET>
 * Idempotenza: notification_log con UNIQUE (appointment_id, type) garantisce
 * che ogni notifica sia inviata una sola volta per appuntamento.
 *
 * Vercel cron config (vercel.json):
 * {
 *   "crons": [{ "path": "/api/cron/reminders", "schedule": "0,15,30,45 * * * *" }]
 * }
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToSubscriptions } from '@/lib/push/send-notification'
import type { PushPayload } from '@/lib/push/send-notification'

type ReminderType = 'reminder_3d' | 'reminder_1d' | 'reminder_day'

interface RawAppointmentRow {
  id: string
  start_time: string
  tenant_id: string
  clients: {
    profile_id: string | null
    full_name: string | null
  } | null
  tenants: {
    business_name: string
    slug: string
  } | null
}

function buildPayload(type: ReminderType, businessName: string, startTime: string, url: string): PushPayload {
  const time = new Date(startTime).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  })
  const date = new Date(startTime).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Rome',
  })

  switch (type) {
    case 'reminder_3d':
      return {
        title: `📅 Appuntamento tra 3 giorni`,
        body:  `Ti aspettiamo da ${businessName} ${date} alle ${time}`,
        url,
        tag:   `reminder-3d-${url}`,
      }
    case 'reminder_1d':
      return {
        title: `⏰ Domani hai un appuntamento!`,
        body:  `Ricorda: da ${businessName} ${date} alle ${time}`,
        url,
        tag:   `reminder-1d-${url}`,
      }
    case 'reminder_day':
      return {
        title: `✂️ Oggi hai un appuntamento alle ${time}!`,
        body:  `Ti aspettiamo da ${businessName}`,
        url,
        tag:   `reminder-day-${url}`,
      }
  }
}

/**
 * Restituisce un range [from, to] in UTC per il tipo di reminder.
 * Il cron gira una volta al giorno alle 7:00 (piano Hobby Vercel),
 * quindi coprimo l'intera giornata target per non perdere nessun appuntamento.
 */
function getTimeRange(type: ReminderType): { from: string; to: string } {
  const now = new Date()
  const DAY = 24 * 60 * 60 * 1000

  let targetDate: Date
  switch (type) {
    case 'reminder_3d':
      targetDate = new Date(now.getTime() + 3 * DAY)
      break
    case 'reminder_1d':
      targetDate = new Date(now.getTime() + 1 * DAY)
      break
    case 'reminder_day':
      targetDate = new Date(now.getTime())
      break
  }

  // Inizio e fine del giorno target (UTC)
  const from = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    0, 0, 0, 0
  ))
  const to = new Date(Date.UTC(
    targetDate.getUTCFullYear(),
    targetDate.getUTCMonth(),
    targetDate.getUTCDate(),
    23, 59, 59, 999
  ))

  return { from: from.toISOString(), to: to.toISOString() }
}

async function processReminders(type: ReminderType): Promise<{ processed: number; sent: number }> {
  const db = createAdminClient()
  const range = getTimeRange(type)

  // Trova appuntamenti nel range che NON hanno ancora ricevuto questo tipo di notifica
  const { data: appointments } = await db
    .from('appointments')
    .select(
      `id, start_time, tenant_id,
       clients(profile_id, full_name),
       tenants(business_name, slug)`
    )
    .eq('status', 'confirmed')
    .is('deleted_at', null)
    .gte('start_time', range.from)
    .lte('start_time', range.to)
    .not(
      'id',
      'in',
      `(SELECT appointment_id FROM notification_log WHERE type = '${type}' AND appointment_id IS NOT NULL)`
    )

  const rows = ((appointments ?? []) as unknown as RawAppointmentRow[])
  let totalSent = 0

  for (const appt of rows) {
    const profileId = appt.clients?.profile_id
    if (!profileId) continue

    const businessName = appt.tenants?.business_name ?? 'il tuo salone'
    const slug = appt.tenants?.slug ?? ''
    const url = `/tenant/app/${slug}`

    const payload = buildPayload(type, businessName, appt.start_time, url)

    // Carica le subscription del cliente
    const { data: subs } = await db
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('tenant_id', appt.tenant_id)
      .eq('profile_id', profileId)

    if (!subs?.length) continue

    const sent = await sendPushToSubscriptions(
      subs as Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
      payload,
    )

    if (sent > 0) {
      totalSent += sent
      // Logga per idempotenza — ignora errore se già esiste (UNIQUE constraint)
      await db.from('notification_log').upsert(
        {
          tenant_id:      appt.tenant_id,
          profile_id:     profileId,
          appointment_id: appt.id,
          type,
        },
        { onConflict: 'appointment_id,type' }
      )
    }
  }

  return { processed: rows.length, sent: totalSent }
}

export async function POST(req: NextRequest) {
  // Auth: Bearer token
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/reminders] CRON_SECRET non configurato')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = await Promise.all([
    processReminders('reminder_3d'),
    processReminders('reminder_1d'),
    processReminders('reminder_day'),
  ])

  const summary = {
    reminder_3d:  results[0],
    reminder_1d:  results[1],
    reminder_day: results[2],
    totalSent: results.reduce((s, r) => s + r.sent, 0),
  }

  console.info('[cron/reminders]', JSON.stringify(summary))
  return NextResponse.json(summary)
}

// Consenti anche GET per debug/ping manuale
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Use POST to trigger reminders' })
}
