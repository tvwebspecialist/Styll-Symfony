import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { FloatingCard } from '@/components/pwa/FloatingCard'

interface Props {
  params: Promise<{ slug: string; id: string }>
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)
}

export default async function OffertaDetailPage({ params }: Props) {
  const { slug, id } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const db = createAdminClient()
  const now = new Date().toISOString()

  const { data: promo } = await (db as any)
    .from('promotions')
    .select('id, title, description, valid_from, valid_until, cover_image_url, status, show_in_app')
    .eq('id', id)
    .eq('tenant_id', tenant.tenant_id)
    .maybeSingle()

  if (!promo || !(promo as any).show_in_app) notFound()

  const validUntil = (promo as any).valid_until as string | null
  const validFrom = (promo as any).valid_from as string
  const isExpired = (promo as any).status !== 'active' || (validUntil !== null && validUntil < now)
  const daysLeft = validUntil ? Math.ceil((new Date(validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const [{ data: svcRows }, { data: prdRows }] = await Promise.all([
    (db as any)
      .from('promotion_services')
      .select('service_id, discount_type, discount_value, services(id, name, price)')
      .eq('promotion_id', id)
      .eq('tenant_id', tenant.tenant_id),
    (db as any)
      .from('promotion_products')
      .select('product_id, discount_type, discount_value, products(id, name, price_sell)')
      .eq('promotion_id', id)
      .eq('tenant_id', tenant.tenant_id),
  ])

  type SvcRow = { service_id: string; discount_type: 'percent' | 'fixed'; discount_value: number; services: { id: string; name: string; price: number } | null }
  type PrdRow = { product_id: string; discount_type: 'percent' | 'fixed'; discount_value: number; products: { id: string; name: string; price_sell: number } | null }

  const services = ((svcRows ?? []) as SvcRow[]).map((r) => {
    const s = Array.isArray(r.services) ? r.services[0] : r.services
    if (!s) return null
    const base = Number(s.price)
    const disc = r.discount_type === 'percent' ? base * r.discount_value / 100 : r.discount_value
    return { id: s.id, name: s.name, originalPrice: base, discountedPrice: Math.max(0, base - disc) }
  }).filter(Boolean) as Array<{ id: string; name: string; originalPrice: number; discountedPrice: number }>

  const products = ((prdRows ?? []) as PrdRow[]).map((r) => {
    const p = Array.isArray(r.products) ? r.products[0] : r.products
    if (!p) return null
    const base = Number(p.price_sell)
    const disc = r.discount_type === 'percent' ? base * r.discount_value / 100 : r.discount_value
    return { id: p.id, name: p.name, originalPrice: base, discountedPrice: Math.max(0, base - disc) }
  }).filter(Boolean) as Array<{ id: string; name: string; originalPrice: number; discountedPrice: number }>

  const brandColor = tenant.primary_color ?? '#1a1a1a'
  const coverUrl = (promo as any).cover_image_url as string | null
  const title = (promo as any).title as string
  const description = (promo as any).description as string | null

  const ctaUrl = services.length === 1
    ? tp(`/prenota?preselect=${services[0].id}`)
    : tp('/prenota')

  const TOP_OFFSET = 'calc(env(safe-area-inset-top, 0px) + 16px)'

  const items = [
    ...services.map(s => ({ key: `s-${s.id}`, name: s.name, disc: s.discountedPrice, orig: s.originalPrice })),
    ...products.map(p => ({ key: `p-${p.id}`, name: p.name, disc: p.discountedPrice, orig: p.originalPrice })),
  ]

  return (
    <main style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>

      {/* ── Hero image — fixed background ─────────────────────────── */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
        background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}88 100%)`,
      }}>
        {coverUrl && (
          <Image src={coverUrl} alt={title} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
        )}
      </div>

      {/* ── Back button ───────────────────────────────────────────── */}
      <Link
        href={tp('/offerte')}
        aria-label="Torna alle offerte"
        style={{
          position: 'fixed',
          top: TOP_OFFSET,
          left: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.62)',
          backdropFilter: 'blur(28px) saturate(210%)',
          WebkitBackdropFilter: 'blur(28px) saturate(210%)',
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.45), 0 8px 24px rgba(15,23,42,0.11)',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.88), rgba(248,250,252,0.68))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
      </Link>

      {/* ── Floating card — fixed bottom ──────────────────────────── */}
      <FloatingCard style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        right: 12,
        margin: 0,
        zIndex: 10,
        boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
        padding: `20px 20px max(env(safe-area-inset-bottom, 0px), 20px)`,
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 16px' }} />

        {/* Expired banner */}
        {isExpired && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 13, color: '#DC2626', fontWeight: 600 }}>Questa offerta non è più disponibile</p>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#18181B', lineHeight: 1.2, margin: '0 0 6px' }}>
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p style={{
            fontSize: 14, color: '#6B7280', lineHeight: 1.5, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {description}
          </p>
        )}

        {/* Validity pills */}
        {!isExpired && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F4F4F5', borderRadius: 999, padding: '4px 10px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: 12, color: '#52525B' }}>
                {validUntil
                  ? `${formatDate(validFrom)} – ${formatDate(validUntil)}`
                  : `Dal ${formatDate(validFrom)} · Senza scadenza`}
              </span>
            </div>
            {daysLeft !== null && daysLeft <= 7 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: daysLeft <= 3 ? '#FEF2F2' : '#FFF7ED', borderRadius: 999, padding: '4px 10px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 3 ? '#DC2626' : '#EA580C' }}>
                  ⚡ {daysLeft <= 0 ? 'Scade oggi' : daysLeft === 1 ? 'Scade domani' : `Scade tra ${daysLeft} giorni`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Services + products compact scrollable list */}
        {items.length > 0 && (
          <div style={{ maxHeight: 120, overflowY: 'auto' }}>
            {items.map((item, i) => (
              <div key={item.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                paddingTop: 6, paddingBottom: 6,
                borderTop: i > 0 ? '1px solid #F4F4F5' : undefined,
              }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#18181B' }}>{item.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#16A34A' }}>{formatPrice(item.disc)}</span>
                  <span style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>{formatPrice(item.orig)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA inside card */}
        {!isExpired && (
          <Link href={ctaUrl} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: 52, borderRadius: 14,
            background: brandColor,
            color: '#FFFFFF', fontSize: 16, fontWeight: 700, textDecoration: 'none',
            marginTop: 16,
          }}>
            Prenota ora →
          </Link>
        )}
      </FloatingCard>
    </main>
  )
}
