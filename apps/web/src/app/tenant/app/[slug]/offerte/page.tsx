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
      {/* Back link */}
      <div style={{ padding: '16px 16px 0' }}>
        <Link
          href={tp('/')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 500, color: '#52525B', textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Home
        </Link>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#18181B', margin: 0 }}>Offerte per te</h1>
      </div>

      {offers.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏷️</div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#18181B', margin: '0 0 6px' }}>Nessuna offerta attiva</p>
          <p style={{ fontSize: 14, color: '#A1A1AA', margin: 0 }}>Le promozioni del salone appariranno qui.</p>
        </div>
      ) : (
        <div
          style={{
            padding: '16px 16px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          } as CSSProperties}
        >
          {offers.map((offer) => {
            const allItems = [...offer.service_items, ...offer.product_items]
            const isInformativa = allItems.length === 0

            let discountLabel = ''
            if (!isInformativa) {
              const pctMax = allItems.filter(i => i.discount_type === 'percent').reduce((m, i) => Math.max(m, i.discount_value), 0)
              const fixedMax = allItems.filter(i => i.discount_type === 'fixed').reduce((m, i) => Math.max(m, i.discount_value), 0)
              if (allItems.length === 1) {
                const item = allItems[0]
                discountLabel = item.discount_type === 'percent' ? `${item.discount_value}% Sconto` : `€${item.discount_value} Sconto`
              } else if (pctMax > 0) {
                discountLabel = `Fino al ${pctMax}% Sconto`
              } else if (fixedMax > 0) {
                discountLabel = `Fino a €${fixedMax} Sconto`
              }
            }

            const days = offer.valid_until ? daysUntil(offer.valid_until) : null
            const isUrgent = days !== null && days <= 3
            let validityText = ''
            if (days !== null) {
              if (days <= 0) validityText = 'Scade oggi'
              else if (days === 1) validityText = 'Scade domani'
              else if (days <= 7) validityText = `Scade tra ${days} giorni`
            }

            return (
              <Link
                key={offer.id}
                href={tp(`/offerte/${offer.id}`)}
                style={{ display: 'block', borderRadius: 16, overflow: 'hidden', background: '#FFF', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                {/* 16:9 image */}
                <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%' }}>
                  {offer.cover_image_url ? (
                    <Image
                      fill
                      src={offer.cover_image_url}
                      alt={offer.title}
                      sizes="(max-width: 600px) 100vw, 50vw"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${brandColor} 0%, ${brandSecondary} 100%)` }} />
                  )}
                  {isUrgent && (
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#DC2626', color: '#FFF', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px' }}>
                      ⚡ {validityText}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '12px 14px 14px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {offer.title}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    {isInformativa ? (
                      <span style={{ fontSize: 11, fontWeight: 600, background: '#F0F9FF', color: '#0369A1', borderRadius: 999, padding: '3px 10px' }}>Informativa</span>
                    ) : discountLabel ? (
                      <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF7ED', color: '#EA580C', borderRadius: 999, padding: '3px 10px' }}>{discountLabel}</span>
                    ) : (
                      <span />
                    )}
                    {!isUrgent && validityText ? (
                      <span style={{ fontSize: 11, color: '#A1A1AA' }}>{validityText}</span>
                    ) : !isUrgent && !validityText && offer.valid_until === null ? (
                      <span style={{ fontSize: 11, color: '#A1A1AA' }}>Senza scadenza</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </main>
  )
}
