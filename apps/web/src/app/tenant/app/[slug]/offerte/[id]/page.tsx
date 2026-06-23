import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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

  return (
    <main style={{ background: '#F2F2F7', paddingBottom: 96 }}>

      {/* ── Hero image ────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: '60vh', width: '100%', background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}88 100%)` }}>
        {coverUrl && (
          <Image
            src={coverUrl}
            alt={title}
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover' }}
          />
        )}
        {/* Top scrim — back button legibility */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Back button */}
        <Link
          href={tp('/offerte')}
          aria-label="Torna alle offerte"
          style={{
            position: 'absolute',
            top: TOP_OFFSET,
            left: 16,
            zIndex: 10,
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
      </div>

      {/* ── Floating sheet ────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        marginTop: -32,
        borderRadius: '24px 24px 0 0',
        background: '#FFFFFF',
        padding: '20px 20px 24px',
        minHeight: '50vh',
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 20px' }} />

        {/* Expired banner */}
        {isExpired && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 14, color: '#DC2626', fontWeight: 600 }}>Questa offerta non è più disponibile</p>
          </div>
        )}

        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#18181B', lineHeight: 1.15, margin: '0 0 8px' }}>
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p style={{ fontSize: 15, color: '#71717A', lineHeight: 1.6, margin: '0 0 12px' }}>
            {description}
          </p>
        )}

        {/* Validity pills */}
        {!isExpired && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#F4F4F5', borderRadius: 999, padding: '5px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span style={{ fontSize: 12, color: '#52525B' }}>
                {validUntil
                  ? `${formatDate(validFrom)} – ${formatDate(validUntil)}`
                  : `Dal ${formatDate(validFrom)} · Senza scadenza`}
              </span>
            </div>
            {daysLeft !== null && daysLeft <= 7 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: daysLeft <= 3 ? '#FEF2F2' : '#FFF7ED', borderRadius: 999, padding: '5px 12px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: daysLeft <= 3 ? '#DC2626' : '#EA580C' }}>
                  ⚡ {daysLeft <= 0 ? 'Scade oggi' : daysLeft === 1 ? 'Scade domani' : `Scade tra ${daysLeft} giorni`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Services card */}
        {services.length > 0 && (
          <div style={{ border: '1px solid #F0F0F0', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 16px 10px', margin: 0, background: '#FAFAFA' }}>
              Servizi inclusi
            </p>
            {services.map((s, i) => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FFF', borderTop: i > 0 ? '1px solid #F0F0F0' : '1px solid #F0F0F0' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#18181B' }}>{s.name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{formatPrice(s.discountedPrice)}</span>
                  <span style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>{formatPrice(s.originalPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Products card */}
        {products.length > 0 && (
          <div style={{ border: '1px solid #F0F0F0', borderRadius: 16, overflow: 'hidden', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 16px 10px', margin: 0, background: '#FAFAFA' }}>
              Prodotti inclusi
            </p>
            {products.map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#FFF', borderTop: i > 0 ? '1px solid #F0F0F0' : '1px solid #F0F0F0' }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#18181B' }}>{p.name}</p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#16A34A' }}>{formatPrice(p.discountedPrice)}</span>
                  <span style={{ fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>{formatPrice(p.originalPrice)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTA fixed bottom ─────────────────────────────────────── */}
      {!isExpired && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}>
          <Link
            href={ctaUrl}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 56,
              borderRadius: 999,
              background: 'var(--brand-primary, #1a1a1a)',
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Prenota ora →
          </Link>
        </div>
      )}
    </main>
  )
}
