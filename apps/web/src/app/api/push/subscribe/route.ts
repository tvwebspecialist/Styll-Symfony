import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildPushBootstrapResponse, resolvePushConfig } from '@/lib/push/config'
import { checkRateLimit } from '@/lib/rate-limit'
import { classifyPushEndpointClaim } from '@/lib/push/endpoint-ownership'

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
  const response = buildPushBootstrapResponse(resolvePushConfig())
  return NextResponse.json(response.body, { status: response.status })
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

  const pushResponse = buildPushBootstrapResponse(resolvePushConfig())
  if (pushResponse.status !== 200) {
    return NextResponse.json(pushResponse.body, { status: pushResponse.status })
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
  const subscriptionPayload = {
    tenant_id: tenantId,
    profile_id: user.id,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: userAgent,
    last_seen_at: new Date().toISOString(),
  }

  const { data: existingSubscription, error: existingSubscriptionError } = await db
    .from('push_subscriptions')
    .select('profile_id')
    .eq('endpoint', subscription.endpoint)
    .maybeSingle()

  if (existingSubscriptionError) {
    console.error('[push/subscribe] endpoint lookup error:', existingSubscriptionError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const claimStatus = classifyPushEndpointClaim(
    existingSubscription
      ? { profileId: existingSubscription.profile_id as string | null }
      : null,
    user.id,
  )

  if (claimStatus === 'owned_by_other_user') {
    return NextResponse.json(
      { error: 'Subscription endpoint already belongs to a different account' },
      { status: 409 },
    )
  }

  let error = null

  if (claimStatus === 'owned_by_request_user') {
    const result = await db
      .from('push_subscriptions')
      .update(subscriptionPayload)
      .eq('endpoint', subscription.endpoint)
      .eq('profile_id', user.id)
    error = result.error
  } else {
    const insertResult = await db.from('push_subscriptions').insert(subscriptionPayload)
    error = insertResult.error

    if (error?.code === '23505') {
      const { data: conflictingSubscription, error: conflictingSubscriptionError } = await db
        .from('push_subscriptions')
        .select('profile_id')
        .eq('endpoint', subscription.endpoint)
        .maybeSingle()

      if (conflictingSubscriptionError) {
        console.error('[push/subscribe] endpoint conflict lookup error:', conflictingSubscriptionError)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      const retryClaimStatus = classifyPushEndpointClaim(
        conflictingSubscription
          ? { profileId: conflictingSubscription.profile_id as string | null }
          : null,
        user.id,
      )

      if (retryClaimStatus === 'owned_by_other_user') {
        return NextResponse.json(
          { error: 'Subscription endpoint already belongs to a different account' },
          { status: 409 },
        )
      }

      const retryResult = await db
        .from('push_subscriptions')
        .update(subscriptionPayload)
        .eq('endpoint', subscription.endpoint)
        .eq('profile_id', user.id)
      error = retryResult.error
    }
  }

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
