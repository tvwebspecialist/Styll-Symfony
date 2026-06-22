import type { CSSProperties } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'

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

  if (!promo || (promo as any).status !== 'active' || !(promo as any).show_in_app) notFound()

  // Check not expired
  const validUntil = (promo as any).valid_until as string | null
  if (validUntil && validUntil < now) notFound()

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
    return { id: s.id, name: s.name, originalPrice: base, discountedPrice: Math.max(0, base - disc), discount_type: r.discount_type, discount_value: r.discount_value }
  }).filter(Boolean) as Array<{ id: string; name: string; originalPrice: number; discountedPrice: number; discount_type: string; discount_value: number }>

  const products = ((prdRows ?? []) as PrdRow[]).map((r) => {
    const p = Array.isArray(r.products) ? r.products[0] : r.products
    if (!p) return null
    const base = Number(p.price_sell)
    const disc = r.discount_type === 'percent' ? base * r.discount_value / 100 : r.discount_value
    return { id: p.id, name: p.name, originalPrice: base, discountedPrice: Math.max(0, base - disc), discount_type: r.discount_type, discount_value: r.discount_value }
  }).filter(Boolean) as Array<{ id: string; name: string; originalPrice: number; discountedPrice: number; discount_type: string; discount_value: number }>

  const brandColor = tenant.primary_color ?? '#1a1a1a'
  const coverUrl = (promo as any).cover_image_url as string | null

  // CTA: if single discounted service, pre-select it
  const ctaUrl = services.length === 1
    ? tp(`/prenota?preselect=${services[0].id}`)
    : tp('/prenota')

  return (
    <main style={{ minHeight: '100vh', background: '#F2F2F7', paddingBottom: 120 }}>
      {/* Back button + Cover */}
      <div style={{ position: 'relative', width: '100%', height: 280 }}>
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt={(promo as any).title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}88 100%)` }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }} />
        <Link
          href={tp('/offerte')}
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
            left: 16,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.92)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        {validUntil && (
          <div style={{ position: 'absolute', top: 'calc(env(safe-area-inset-top, 0px) + 16px)', right: 16, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(6px)', color: '#FFF', fontSize: 12, fontWeight: 600, borderRadius: 999, padding: '4px 12px' }}>
            Valida fino al {formatDate(validUntil)}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 16px 0' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#18181B', margin: 0, lineHeight: 1.2 }}>
          {(promo as any).title}
        </h1>
        {(promo as any).description && (
          <p style={{ fontSize: 15, color: '#71717A', marginTop: 8, lineHeight: 1.5 }}>
            {(promo as any).description}
          </p>
        )}
        {!validUntil && (
          <p style={{ fontSize: 13, color: '#A1A1AA', marginTop: 8 }}>Senza scadenza</p>
        )}
      </div>

      {/* Services */}
      {services.length > 0 && (
        <div style={{ margin: '20px 16px 0', background: '#FFF', borderRadius: 20, overflow: 'hidden' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 16px 10px', margin: 0 }}>Servizi inclusi</p>
          {services.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F4F4F5' : 'none' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#18181B' }}>{s.name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{formatPrice(s.discountedPrice)}</span>
                <span style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>{formatPrice(s.originalPrice)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products */}
      {products.length > 0 && (
        <div style={{ margin: '12px 16px 0', background: '#FFF', borderRadius: 20, overflow: 'hidden' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 16px 10px', margin: 0 }}>Prodotti inclusi</p>
          {products.map((p, i) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: i > 0 ? '1px solid #F4F4F5' : 'none' }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#18181B' }}>{p.name}</p>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{formatPrice(p.discountedPrice)}</span>
                <span style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>{formatPrice(p.originalPrice)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CTA fixed bottom */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 'max(16px, env(safe-area-inset-bottom)) 16px 24px', background: 'rgba(242,242,247,0.96)', backdropFilter: 'blur(12px)' } as CSSProperties}>
        <Link
          href={ctaUrl}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            minHeight: 56,
            borderRadius: 999,
            background: brandColor,
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Prenota ora →
        </Link>
      </div>
    </main>
  )
}
