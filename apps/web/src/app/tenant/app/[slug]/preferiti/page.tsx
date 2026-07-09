import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Heart } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getWishlistProductIds } from '@/lib/actions/wishlist'
import { ProdottiClient } from '../prodotti/_components/ProdottiClient'
import type { ProductListItem } from '../prodotti/_components/ProdottiClient'
import { ProfileLoginGate } from '../_components/ProfileLoginGate'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PreferitiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <main className="min-h-screen bg-white">
        <ProfileLoginGate
          slug={slug}
          tenantId={tenant.tenant_id}
          primaryColor={tenant.primary_color}
          logoUrl={tenant.logo_url}
          businessName={tenant.business_name}
        />
      </main>
    )
  }

  const db = createAdminClient()
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('tenant_id', tenant.tenant_id)
    .eq('profile_id', user.id)
    .is('deleted_at', null)
    .maybeSingle()

  let clientId: string | null = null
  let products: ProductListItem[] = []
  let wishlistIds: string[] = []

  if (client) {
    clientId = (client as { id: string }).id
    wishlistIds = await getWishlistProductIds({
      tenantId: tenant.tenant_id,
      clientId,
    })

    if (wishlistIds.length > 0) {
      const [prodRes, invRes] = await Promise.all([
        db
          .from('products')
          .select('id, name, brand, category, description, photo_url, price_sell')
          .eq('tenant_id', tenant.tenant_id)
          .eq('is_active', true)
          .in('id', wishlistIds),
        db
          .from('product_inventory')
          .select('product_id, quantity, low_stock_threshold')
          .eq('tenant_id', tenant.tenant_id)
          .in('product_id', wishlistIds),
      ])

      const inventoryMap = new Map<string, { qty: number; threshold: number }>()
      for (const row of (invRes.data ?? []) as Array<{
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

      products = (
        (prodRes.data ?? []) as Array<{
          id: string
          name: string
          brand: string | null
          category: string | null
          description: string | null
          photo_url: string | null
          price_sell: number
        }>
      ).map((p) => {
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
    }
  }

  if (wishlistIds.length === 0) {
    return (
      <main className="min-h-screen bg-white pb-24">
        <div
          className="mx-auto max-w-xl px-4 flex flex-col items-center"
          style={{ paddingTop: 80 }}
        >
          <div className="size-16 rounded-full bg-neutral-100 flex items-center justify-center mb-5">
            <Heart size={28} color="#d1d5db" />
          </div>
          <p className="text-[17px] font-bold text-neutral-700 mb-2 text-center">
            Nessun prodotto preferito
          </p>
          <p className="text-sm text-neutral-400 text-center mb-8">
            Aggiungi prodotti ai preferiti per trovarli qui
          </p>
          <Link
            href={tp('/prodotti')}
            className="inline-flex items-center rounded-2xl px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: tenant.primary_color ?? '#1a1a1a' }}
          >
            Sfoglia prodotti
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <div style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
        <ProdottiClient
          products={products}
          categories={[]}
          tenantId={tenant.tenant_id}
          slug={slug}
          isLoggedIn={true}
          clientId={clientId}
          initialWishlistIds={wishlistIds}
        />
      </div>
    </main>
  )
}
