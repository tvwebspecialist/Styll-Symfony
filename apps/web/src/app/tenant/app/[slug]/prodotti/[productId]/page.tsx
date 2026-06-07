import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ShoppingBag, Sparkles } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { getUpcomingAppointmentsForProduct } from '@/lib/actions/wishlist'
import { ProductDetailClient } from './_components/ProductDetailClient'

interface Props {
  params: Promise<{ slug: string; productId: string }>
}

export const revalidate = 300

export default async function ProductDetailPage({ params }: Props) {
  const { slug, productId } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const db = createAdminClient()

  const { data: product } = await db
    .from('products')
    .select('id, name, brand, category, description, photo_url, price_sell, is_new, is_active, show_on_site')
    .eq('id', productId)
    .eq('tenant_id', tenant.tenant_id)
    .maybeSingle()

  if (!product || !product.is_active || !product.show_on_site) {
    notFound()
  }

  const p = product as {
    id: string
    name: string
    brand: string | null
    category: string | null
    description: string | null
    photo_url: string | null
    price_sell: number
    is_new: boolean
  }

  // Fetch locations + inventory in parallel
  const [locationsRes, inventoryRes] = await Promise.all([
    db
      .from('locations')
      .select('id, name')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('location_id, quantity')
      .eq('tenant_id', tenant.tenant_id)
      .eq('product_id', productId),
  ])

  const stockMap = new Map<string, number>()
  for (const row of (inventoryRes.data ?? []) as Array<{
    location_id: string
    quantity: number
  }>) {
    stockMap.set(row.location_id, (stockMap.get(row.location_id) ?? 0) + row.quantity)
  }

  const locationStocks = (locationsRes.data ?? [])
    .map((loc: { id: string; name: string }) => ({
      id: loc.id,
      name: loc.name,
      available: (stockMap.get(loc.id) ?? 0) > 0,
    }))

  // Auth
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let clientId: string | null = null
  let isInWishlist = false
  let upcomingAppointments: Awaited<ReturnType<typeof getUpcomingAppointmentsForProduct>> = []

  if (user) {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.tenant_id)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (client) {
      clientId = (client as { id: string }).id

      const [wishlistRes, appointments] = await Promise.all([
        db
          .from('client_product_wishlist')
          .select('id')
          .eq('tenant_id', tenant.tenant_id)
          .eq('client_id', clientId)
          .eq('product_id', productId)
          .maybeSingle(),
        getUpcomingAppointmentsForProduct({
          tenantId: tenant.tenant_id,
          profileId: user.id,
          productId,
        }),
      ])

      isInWishlist = !!wishlistRes.data
      upcomingAppointments = appointments
    }
  }

  const brandColor = tenant.primary_color ?? '#1a1a1a'

  return (
    <main
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '16px 16px 32px',
        position: 'relative',
      }}
    >
      {/* Hero image */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          borderRadius: 24,
          overflow: 'hidden',
          background: '#F5F5F5',
          marginBottom: 20,
        }}
      >
        {p.photo_url ? (
          <Image
            src={p.photo_url}
            alt={p.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 640px"
            priority
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={64} color="#D0D0D0" />
          </div>
        )}

        {p.is_new && (
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 100,
              background: '#111',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <Sparkles size={11} />
            Novità
          </div>
        )}

        {/* Brand strip at bottom of hero */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)',
            padding: '24px 16px 16px',
          }}
        >
          {p.brand && (
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {p.brand}
            </p>
          )}
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.15,
              fontFamily: 'var(--font-tenant, inherit)',
            }}
          >
            {p.name}
          </h1>
        </div>
      </div>

      {/* Description */}
      {p.description && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #F0F0F0',
            padding: '14px 16px',
            marginBottom: 16,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#B0B0B0',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: 8,
            }}
          >
            Descrizione
          </p>
          <p style={{ fontSize: 14, color: '#444', lineHeight: 1.6 }}>{p.description}</p>
        </div>
      )}

      {/* Category tag */}
      {p.category && (
        <div style={{ marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              borderRadius: 100,
              background: `${brandColor}15`,
              color: brandColor,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {p.category}
          </span>
        </div>
      )}

      {/* Interactive part: back button, favorites, appointment linker, price bar */}
      <ProductDetailClient
        productId={productId}
        productName={p.name}
        priceSell={Number(p.price_sell ?? 0)}
        tenantId={tenant.tenant_id}
        slug={slug}
        isLoggedIn={!!user}
        clientId={clientId}
        initialIsFavorite={isInWishlist}
        locationStocks={locationStocks}
        upcomingAppointments={upcomingAppointments}
      />
    </main>
  )
}
