import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

  const body = await req.json() as {
    tenantId: string
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  }

  const { tenantId, subscription } = body
  if (!tenantId || !subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  // Verify tenant exists and user has access (is a client of this tenant)
  const db = createAdminClient()
  const { data: tenant } = await db
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .eq('status', 'active')
    .maybeSingle()
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

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

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as { endpoint: string }
  if (!body?.endpoint) return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 })

  const db = createAdminClient()
  await db
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('profile_id', user.id) // sicurezza: solo la tua subscription

  return NextResponse.json({ success: true })
}
