import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Heart, ShoppingBag } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getWishlistProductIds } from '@/lib/actions/wishlist'
import { ProdottiClient } from './_components/ProdottiClient'
import type { ProductListItem } from './_components/ProdottiClient'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 300

export default async function ProdottiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [productsRes, inventoryRes] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, category, photo_url, price_sell, display_order')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('product_id, quantity')
      .eq('tenant_id', tenant.tenant_id),
  ])

  const rawProducts = (productsRes.data ?? []) as Array<{
    id: string
    name: string
    brand: string | null
    category: string | null
    photo_url: string | null
    price_sell: number
    display_order: number
  }>

  // Build availability map: product_id → total quantity across all locations
  const inventoryMap = new Map<string, number>()
  for (const row of (inventoryRes.data ?? []) as Array<{
    product_id: string
    quantity: number
  }>) {
    inventoryMap.set(row.product_id, (inventoryMap.get(row.product_id) ?? 0) + row.quantity)
  }

  // Get wishlist for logged-in clients
  let clientId: string | null = null
  let wishlistIds: string[] = []

  if (user) {
    const { data: client } = await db
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.tenant_id)
      .eq('profile_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (client) {
      clientId = client.id
      wishlistIds = await getWishlistProductIds({
        tenantId: tenant.tenant_id,
        clientId: client.id,
      })
    }
  }

  const products: ProductListItem[] = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    photo_url: p.photo_url,
    price_sell: Number(p.price_sell ?? 0),
    available: (inventoryMap.get(p.id) ?? 0) > 0,
  }))

  const categories = Array.from(
    new Set(rawProducts.map((p) => p.category ?? 'Altro').filter(Boolean)),
  )

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#222', marginBottom: 2 }}>
            Prodotti
          </h1>
          <p style={{ fontSize: 13, color: '#B0B0B0' }}>I prodotti disponibili nel salone</p>
        </div>
        <Link
          href={tp('/prodotti/preferiti')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            borderRadius: 100,
            background: '#F5F5F5',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: '#555',
          }}
        >
          <Heart size={14} color="var(--brand-primary, #222)" />
          Preferiti
        </Link>
      </div>

      {products.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            paddingTop: 80,
            textAlign: 'center',
          }}
        >
          <ShoppingBag size={48} color="#E0E0E0" />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#B0B0B0' }}>
            Nessun prodotto disponibile al momento
          </p>
          <p style={{ fontSize: 13, color: '#C8C8C8' }}>Torna presto per scoprire le novità</p>
        </div>
      ) : (
        <ProdottiClient
          products={products}
          categories={categories}
          tenantId={tenant.tenant_id}
          slug={slug}
          isLoggedIn={!!user}
          clientId={clientId}
          initialWishlistIds={wishlistIds}
        />
      )}
    </main>
  )
}
