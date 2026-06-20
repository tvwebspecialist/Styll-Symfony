import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/push/subscribe
 * Ritorna la VAPID public key per l'inizializzazione del PushManager client-side.
 *
 * POST /api/push/subscribe
 * Salva (o aggiorna) la PushSubscription dell'utente corrente.
 * Body: { tenantId, subscription: { endpoint, keys: { p256dh, auth } } }
 *
 * DELETE /api/push/subscribe
 * Rimuove la subscription dell'endpoint corrente.
 * Body: { endpoint }
 */

const PushSubscribeSchema = z.object({
  tenantId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
})

const PushUnsubscribeSchema = z.object({
  endpoint: z.string().url(),
})

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ error: 'Push not configured' }, { status: 503 })
  }
  return NextResponse.json({ vapidPublicKey: key })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Rate limit: max 5 registrazioni/aggiornamenti per utente all'ora.
  // Check posto DOPO l'auth così gli utenti anonimi ricevono 401, non 429.
  const rl = checkRateLimit(`push-subscribe:${user.id}`, 5, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const body = await req.json()
  const parsed = PushSubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { tenantId, subscription } = parsed.data

  // Verify tenant exists and user has access (is a client of this tenant)
  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  // Accetta sia clienti sia staff attivi del tenant
  const [{ data: clientRow }, { data: staffRow }] = await Promise.all([
    db.from('clients').select('id').eq('tenant_id', tenantId).eq('profile_id', user.id).is('deleted_at', null).maybeSingle(),
    db.from('staff_members').select('id').eq('tenant_id', tenantId).eq('profile_id', user.id).eq('is_active', true).is('deleted_at', null).maybeSingle(),
  ])
  if (!clientRow && !staffRow) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

  const userAgent = req.headers.get('user-agent') ?? null

  // Upsert: se l'endpoint esiste già, aggiorna last_seen_at
  const { error } = await db.from('push_subscriptions').upsert(
    {
      tenant_id:    tenantId,
      profile_id:   user.id,
      endpoint:     subscription.endpoint,
      p256dh:       subscription.keys.p256dh,
      auth:         subscription.keys.auth,
      user_agent:   userAgent,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint' }
  )

  if (error) {
    console.error('[push/subscribe] DB error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Marca push_accepted: true così getNotificationChannel() usa 'push' e non 'email'
  const { data: profileRow } = await db
    .from('profiles')
    .select('notification_preferences')
    .eq('id', user.id)
    .maybeSingle()
  const currentPrefs = (profileRow?.notification_preferences as Record<string, boolean>) ?? {}
  if (currentPrefs.push_accepted !== true) {
    await db
      .from('profiles')
      .update({ notification_preferences: { ...currentPrefs, push_accepted: true, push_prompted: true } })
      .eq('id', user.id)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rl = checkRateLimit(`push-unsubscribe:${user.id}`, 10, 60 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    )
  }

  const body = await req.json()
  const parsed = PushUnsubscribeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const db = createAdminClient()
  await db
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', parsed.data.endpoint)
    .eq('profile_id', user.id) // sicurezza: solo la tua subscription

  return NextResponse.json({ success: true })
}
