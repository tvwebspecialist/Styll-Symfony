import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPromotionPush } from '@/lib/push/promotion-push'

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

  // Verifica ruolo owner o manager nel tenant
  const { data: staffRow } = await db
    .from('staff_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('profile_id', user.id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .maybeSingle()

  const role = (staffRow as any)?.role
  if (role !== 'owner' && role !== 'manager') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await sendPromotionPush(promotionId, tenantId)
  return NextResponse.json(result)
}
