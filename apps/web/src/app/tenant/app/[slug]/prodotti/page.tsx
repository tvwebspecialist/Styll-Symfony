import { notFound } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
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

  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const db = createAdminClient()

  const [productsRes, inventoryRes] = await Promise.all([
    db
      .from('products')
      .select('id, name, brand, category, description, photo_url, price_sell, display_order')
      .eq('tenant_id', tenant.tenant_id)
      .eq('is_active', true)
      .eq('show_on_site', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    db
      .from('product_inventory')
      .select('product_id, quantity, low_stock_threshold')
      .eq('tenant_id', tenant.tenant_id),
  ])

  const rawProducts = (productsRes.data ?? []) as Array<{
    id: string
    name: string
    brand: string | null
    category: string | null
    description: string | null
    photo_url: string | null
    price_sell: number
    display_order: number
  }>

  // Aggregate per product: total quantity + max threshold across locations
  const inventoryMap = new Map<string, { qty: number; threshold: number }>()
  for (const row of (inventoryRes.data ?? []) as Array<{
    product_id: string
    quantity: number
    low_stock_threshold: number | null
  }>) {
    const existing = inventoryMap.get(row.product_id)
    inventoryMap.set(row.product_id, {
      qty: (existing?.qty ?? 0) + row.quantity,
      threshold: Math.max(existing?.threshold ?? 0, row.low_stock_threshold ?? 0),
    })
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
      clientId = (client as { id: string }).id
      wishlistIds = await getWishlistProductIds({
        tenantId: tenant.tenant_id,
        clientId,
      })
    }
  }

  const products: ProductListItem[] = rawProducts.map((p) => {
    const inv = inventoryMap.get(p.id) ?? { qty: 0, threshold: 0 }
    return {
      id: p.id,
      name: p.name,
      brand: p.brand,
      category: p.category,
      description: p.description,
      photo_url: p.photo_url,
      price_sell: Number(p.price_sell ?? 0),
      available: inv.qty > 0,
      lowStock: inv.qty > 0 && inv.threshold > 0 && inv.qty <= inv.threshold,
    }
  })

  const categories = Array.from(
    new Set(rawProducts.map((p) => p.category ?? 'Altro').filter(Boolean)),
  )

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
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
