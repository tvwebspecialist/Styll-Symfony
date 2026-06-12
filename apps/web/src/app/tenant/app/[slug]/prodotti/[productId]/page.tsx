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
        {/* Top gradient — control readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 30%)',
          pointerEvents: 'none',
        }} />
        {/* Bottom blur zone — softens image edge for glass panel backdrop */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '26%',
          backdropFilter: 'blur(24px) saturate(130%)',
          WebkitBackdropFilter: 'blur(24px) saturate(130%)',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 55%)',
          maskImage: 'linear-gradient(to bottom, transparent, black 55%)',
          pointerEvents: 'none',
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
        upcomingAppointments={upcomingAppointments}
        brandColor={brandColor}
      />
    </main>
  )
}
