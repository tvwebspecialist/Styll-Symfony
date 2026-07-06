import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPromotionPush } from '@/lib/push/promotion-push'
import {
  getTenantRoleContext,
  hasTenantPermission,
  TENANT_PERMISSIONS,
} from '@/lib/tenant-role-guard'

/**
 * POST /api/promotions/[id]/notify
 * Invia una push notification a tutti i clienti PWA del tenant per la promozione.
 * Idempotente: invii multipli per la stessa promozione vengono ignorati.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: promotionId } = await params

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(promotionId)) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  // Auth: utente autenticato con ruolo owner o manager nel tenant di questa promozione
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  // Trova il tenant_id della promozione
  const { data: promo } = await (db as any)
    .from('promotions')
    .select('id, tenant_id, status')
    .eq('id', promotionId)
    .maybeSingle()

  if (!promo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const tenantId = (promo as any).tenant_id as string

  if ((promo as any).status !== 'active') {
    return NextResponse.json({ error: 'Promotion is not active' }, { status: 400 })
  }

  const tenantRoleCtx = await getTenantRoleContext(tenantId)
  if (
    !tenantRoleCtx
    || !hasTenantPermission(
      tenantRoleCtx.role,
      TENANT_PERMISSIONS.MANAGE_MARKETING
    )
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: 1 push per promotion per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount } = await (db as any)
    .from('notification_log')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('promotion_id', promotionId)
    .eq('type', 'promotion_published')
    .gte('created_at', oneHourAgo)

  if ((recentCount ?? 0) > 0) {
    return NextResponse.json(
      { error: 'Rate limit: attendi almeno 1 ora tra un invio e il successivo' },
      { status: 429 },
    )
  }

  // Safety cap: block if too many recipients
  const { count: subCount } = await (db as any)
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  if ((subCount ?? 0) > 10000) {
    console.error('[notify] Recipient limit exceeded', { tenantId, count: subCount })
    return NextResponse.json(
      { error: 'Limite destinatari: contatta il supporto Styll' },
      { status: 429 },
    )
  }

  const result = await sendPromotionPush(promotionId, tenantId)
  return NextResponse.json(result)
}
