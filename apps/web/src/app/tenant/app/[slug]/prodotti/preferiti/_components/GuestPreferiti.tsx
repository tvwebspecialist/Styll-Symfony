'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, startTransition } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import { useFavoriteProducts } from '@/lib/hooks/use-favorite-products'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface Props {
  tenantId: string
  slug: string
  prodottiHref: string
}

interface StoredProduct {
  id: string
  name: string
  brand: string | null
  photo_url: string | null
  price_sell: number
  available: boolean
  category: string | null
}

type State = { loaded: false } | { loaded: true; products: StoredProduct[] }

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export function GuestPreferiti({ tenantId, slug, prodottiHref }: Props) {
  const storageKey = `styll_wishlist_${slug}`
  const productsCacheKey = `styll_wishlist_products_${slug}`
  const [state, setState] = useState<State>({ loaded: false })

  const { isFavorite, toggle } = useFavoriteProducts({
    isLoggedIn: false,
    tenantId,
    slug,
    initialIds: [],
  })
  const tenantPath = useTenantPath(slug)

  useEffect(() => {
    let products: StoredProduct[] = []
    try {
      const stored = localStorage.getItem(storageKey)
      const ids: string[] = stored ? (JSON.parse(stored) as string[]) : []
      if (ids.length > 0) {
        const cached = localStorage.getItem(productsCacheKey)
        if (cached) {
          const all = JSON.parse(cached) as StoredProduct[]
          products = all.filter((p) => ids.includes(p.id))
        }
      }
    } catch {
      // ignore
    }
    startTransition(() => setState({ loaded: true, products }))
  }, [storageKey, productsCacheKey])

  if (!state.loaded) return null

  const favProducts = state.products.filter((p) => isFavorite(p.id))

  return (
    <div>
      {/* Account nudge */}
      <div
        style={{
          background: 'var(--brand-primary, #222)',
          borderRadius: 18,
          padding: '14px 16px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 20, flexShrink: 0 }}>💡</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#FFFFFF', marginBottom: 4 }}>
            Crea un account gratis
          </p>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
            I tuoi preferiti vengono salvati solo su questo dispositivo. Accedi per non perderli mai.
          </p>
        </div>
      </div>

      {favProducts.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            paddingTop: 40,
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
            href={prodottiHref}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {favProducts.map((product) => (
            <div
              key={product.id}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: 14,
                background: '#FFFFFF',
                borderRadius: 18,
                border: '1px solid #F0F0F0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <Link
                href={tenantPath(`/prodotti/${product.id}`)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 18,
                  zIndex: 0,
                }}
                aria-label={`Vedi dettagli ${product.name}`}
              />
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 12,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: '#F5F5F5',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {product.photo_url ? (
                  <Image
                    src={product.photo_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="64px"
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
                    <ShoppingBag size={22} color="#D0D0D0" />
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: '#222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}
                >
                  {product.name}
                </p>
                {product.brand && (
                  <p style={{ fontSize: 12, color: '#B0B0B0' }}>{product.brand}</p>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 8,
                  flexShrink: 0,
                  zIndex: 1,
                }}
              >
                {product.price_sell > 0 && (
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-primary, #222)' }}>
                    {formatPrice(product.price_sell)}
                  </p>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    void toggle(product.id)
                  }}
                  aria-label="Rimuovi dai preferiti"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'var(--brand-primary, #222)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={16} color="#FFFFFF" fill="#FFFFFF" strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
