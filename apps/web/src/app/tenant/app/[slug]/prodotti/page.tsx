import { notFound } from 'next/navigation'
import { ShoppingBag } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

interface Product {
  id: string
  name: string
  brand: string | null
  category: string | null
  description: string | null
  photo_url: string | null
  price_sell: number
}

function groupByCategory(products: Product[]): Map<string, Product[]> {
  const map = new Map<string, Product[]>()
  for (const p of products) {
    const cat = p.category ?? 'Altro'
    if (!map.has(cat)) map.set(cat, [])
    map.get(cat)!.push(p)
  }
  return map
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export default async function ProdottiPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const db = createAdminClient()
  const { data: products } = await db
    .from('products')
    .select('id, name, brand, category, description, photo_url, price_sell')
    .eq('tenant_id', tenant.tenant_id)
    .eq('is_active', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  const grouped = groupByCategory((products ?? []) as Product[])

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#222222', marginBottom: 4 }}>
          Prodotti
        </h1>
        <p style={{ fontSize: 13, color: '#B0B0B0' }}>
          I prodotti disponibili nel salone
        </p>
      </div>

      {grouped.size === 0 ? (
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Array.from(grouped.entries()).map(([category, items]) => (
            <section key={category}>
              {/* Category header */}
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#B0B0B0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 10,
                }}
              >
                {category}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {items.map((product) => (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: 14,
                      background: '#FFFFFF',
                      borderRadius: 16,
                      border: '1px solid #F0F0F0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    {/* Product image */}
                    {product.photo_url ? (
                      <img
                        src={product.photo_url}
                        alt={product.name}
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          borderRadius: 12,
                          background: '#F5F5F5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ShoppingBag size={24} color="#D0D0D0" />
                      </div>
                    )}

                    {/* Product info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#222222',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {product.name}
                      </p>
                      {product.brand && (
                        <p style={{ fontSize: 12, color: '#B0B0B0' }}>{product.brand}</p>
                      )}
                    </div>

                    {/* Price */}
                    {product.price_sell > 0 && (
                      <p
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: 'var(--brand-primary, #222222)',
                          flexShrink: 0,
                        }}
                      >
                        {formatPrice(product.price_sell)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
