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

  const brandColor = tenant.primary_color ?? '#1a1a1a'
  const brandSecondary = tenant.secondary_color ?? brandColor

  return (
    <main style={{ minHeight: '100vh', background: '#F2F2F7', paddingBottom: 100 }}>
      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#18181B', margin: 0 }}>Offerte per te</h1>
        {offers.length === 0 && (
          <p style={{ fontSize: 14, color: '#A1A1AA', marginTop: 16 }}>Nessuna offerta attiva al momento.</p>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingLeft: 16,
          paddingRight: 16,
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as CSSProperties}
      >
        {offers.map((offer, index) => {
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
                width: 'calc(100vw - 40px)',
                height: '200px',
                flexShrink: 0,
                scrollSnapAlign: 'start',
                position: 'relative',
                borderRadius: 16,
                overflow: 'hidden',
                textDecoration: 'none',
              } as CSSProperties}
            >
              {offer.cover_image_url ? (
                <Image
                  fill
                  src={offer.cover_image_url}
                  alt={offer.title}
                  sizes="calc(100vw - 40px)"
                  style={{ objectFit: 'cover' }}
                  priority={index === 0}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${brandColor} 0%, ${brandSecondary} 100%)` }} />
              )}

              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 55%)' }} />

              {showExpiry && (
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', color: '#FFF', fontSize: 11, fontWeight: 600, borderRadius: 999, padding: '3px 10px' }}>
                  {expiryText}
                </div>
              )}

              <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: '#FFF', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {offer.title}
                  </p>
                  {discountLabel && (
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: '#18181B', lineHeight: 1.2 }}>
                      {discountLabel}
                    </p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
