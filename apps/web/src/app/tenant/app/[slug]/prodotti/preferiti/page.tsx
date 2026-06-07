import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getWishlistProductIds } from '@/lib/actions/wishlist'
import { ProdottiClient } from '../_components/ProdottiClient'
import type { ProductListItem } from '../_components/ProdottiClient'
import { GuestPreferiti } from './_components/GuestPreferiti'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function PreferitiPage({ params }: Props) {
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

  let clientId: string | null = null
  let products: ProductListItem[] = []
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

      if (wishlistIds.length > 0) {
        // Fetch all products in wishlist in one query
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

        products = ((prodRes.data ?? []) as Array<{
          id: string
          name: string
          brand: string | null
          category: string | null
          description: string | null
          photo_url: string | null
          price_sell: number
        }>).map((p) => {
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
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href={tp('/prodotti')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 13,
            color: '#9CA3AF',
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          ← Tutti i prodotti
        </Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#222', marginBottom: 2 }}>
          Preferiti
        </h1>
        <p style={{ fontSize: 13, color: '#B0B0B0' }}>I prodotti che hai salvato</p>
      </div>

      {!user ? (
        // Guest state: delegate to client component that reads localStorage
        <GuestPreferiti
          tenantId={tenant.tenant_id}
          slug={slug}
          prodottiHref={tp('/prodotti')}
        />
      ) : products.length === 0 ? (
        // Logged in, no favorites
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            paddingTop: 60,
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 32 }}>🤍</p>
          <p style={{ fontSize: 16, fontWeight: 600, color: '#B0B0B0' }}>
            Nessun prodotto nei preferiti
          </p>
          <p style={{ fontSize: 13, color: '#C8C8C8', marginBottom: 16 }}>
            Sfoglia il catalogo e aggiungi i prodotti che ti interessano
          </p>
          <Link
            href={tp('/prodotti')}
            style={{
              display: 'inline-flex',
              padding: '12px 24px',
              borderRadius: 100,
              background: 'var(--brand-primary, #222)',
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Sfoglia i prodotti
          </Link>
        </div>
      ) : (
        <>
          <ProdottiClient
            products={products}
            categories={[]}
            tenantId={tenant.tenant_id}
            slug={slug}
            isLoggedIn={true}
            clientId={clientId}
            initialWishlistIds={wishlistIds}
          />
        </>
      )}
    </main>
  )
}
