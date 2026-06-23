import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getActiveOffersForClient } from '@/lib/actions/offers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { daysUntil } from '@/lib/utils/offer-pricing'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OffertePage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)

  let clientId: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const db = createAdminClient()
      const { data: clientRow } = await db
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.tenant_id)
        .eq('profile_id', user.id)
        .is('deleted_at', null)
        .maybeSingle()
      clientId = (clientRow as { id: string } | null)?.id ?? null
    }
  } catch { /* graceful degradation */ }

  const offers = clientId
    ? await getActiveOffersForClient(tenant.tenant_id, clientId).catch(() => [])
    : []

  return (
    <main style={{ minHeight: '100vh', background: '#F2F2F7', paddingBottom: 100 }}>
      {offers.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#18181B', margin: '0 0 6px' }}>Nessuna offerta attiva</p>
          <p style={{ fontSize: 14, color: '#A1A1AA', margin: 0 }}>Le promozioni del salone appariranno qui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
          {offers.map((offer) => {
            const allItems = [...offer.service_items, ...offer.product_items]
            const pctMax = allItems.filter(i => i.discount_type === 'percent').reduce((m, i) => Math.max(m, i.discount_value), 0)
            const fixedMax = allItems.filter(i => i.discount_type === 'fixed').reduce((m, i) => Math.max(m, i.discount_value), 0)
            let discountLabel = ''
            if (allItems.length === 1) {
              const item = allItems[0]
              discountLabel = item.discount_type === 'percent' ? `${item.discount_value}% Sconto` : `€${item.discount_value} Sconto`
            } else if (pctMax > 0) {
              discountLabel = `Fino al ${pctMax}% Sconto`
            } else if (fixedMax > 0) {
              discountLabel = `Fino a €${fixedMax} Sconto`
            }

            const showExpiry = offer.valid_until !== null && daysUntil(offer.valid_until) <= 7
            const expiryText = offer.valid_until ? `Scade tra ${daysUntil(offer.valid_until)} gg` : ''

            return (
              <Link
                key={offer.id}
                href={tp(`/offerte/${offer.id}`)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 220,
                  borderRadius: 20,
                  overflow: 'hidden',
                  position: 'relative',
                  textDecoration: 'none',
                  background: 'linear-gradient(135deg, #27272A 0%, #3F3F46 100%)',
                } as CSSProperties}
              >
                {offer.cover_image_url && (
                  <Image
                    fill
                    src={offer.cover_image_url}
                    alt={offer.title}
                    sizes="(max-width: 640px) 100vw, 640px"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
                {showExpiry && (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: 'rgba(0,0,0,0.50)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    color: '#FFFFFF',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 999,
                    padding: '3px 10px',
                  } as CSSProperties}>
                    {expiryText}
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 12,
                  right: 12,
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {offer.title}
                    </p>
                    {discountLabel && (
                      <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#18181B', lineHeight: 1.2 }}>
                        {discountLabel}
                      </p>
                    )}
                  </div>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
