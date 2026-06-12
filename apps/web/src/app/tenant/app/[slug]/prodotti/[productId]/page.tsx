import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
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
  for (const row of (inventoryRes.data ?? []) as Array<{ location_id: string; quantity: number }>) {
    stockMap.set(row.location_id, (stockMap.get(row.location_id) ?? 0) + row.quantity)
  }

  const locationStocks = (locationsRes.data ?? []).map((loc: { id: string; name: string }) => ({
    id: loc.id,
    name: loc.name,
    available: (stockMap.get(loc.id) ?? 0) > 0,
  }))

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
    <main style={{ position: 'fixed', inset: 0, zIndex: 2, overflow: 'hidden', background: '#111' }}>
      {/* Fullscreen background image */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {p.photo_url ? (
          <Image
            src={p.photo_url}
            alt={p.name}
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag size={80} color="#3a3a3c" />
          </div>
        )}
        {/* Gradient — darken top for controls, subtle at bottom */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.05) 100%)',
        }} />
      </div>

      <ProductDetailClient
        productId={productId}
        productName={p.name}
        productBrand={p.brand}
        productCategory={p.category}
        productDescription={p.description}
        isNew={p.is_new}
        priceSell={Number(p.price_sell ?? 0)}
        tenantId={tenant.tenant_id}
        slug={slug}
        isLoggedIn={!!user}
        clientId={clientId}
        initialIsFavorite={isInWishlist}
        locationStocks={locationStocks}
        upcomingAppointments={upcomingAppointments}
        brandColor={brandColor}
      />
    </main>
  )
}
