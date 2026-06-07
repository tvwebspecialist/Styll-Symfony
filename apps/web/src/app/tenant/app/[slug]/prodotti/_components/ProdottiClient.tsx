'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import { useFavoriteProducts } from '@/lib/hooks/use-favorite-products'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

export interface ProductListItem {
  id: string
  name: string
  brand: string | null
  category: string | null
  photo_url: string | null
  price_sell: number
  available: boolean
}

interface Props {
  products: ProductListItem[]
  categories: string[]
  tenantId: string
  slug: string
  isLoggedIn: boolean
  clientId?: string | null
  initialWishlistIds: string[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

export function ProdottiClient({
  products,
  categories,
  tenantId,
  slug,
  isLoggedIn,
  clientId,
  initialWishlistIds,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const { isFavorite, toggle } = useFavoriteProducts({
    isLoggedIn,
    clientId,
    tenantId,
    slug,
    initialIds: initialWishlistIds,
  })
  const tenantPath = useTenantPath(slug)

  const filtered =
    selectedCategory == null
      ? products
      : products.filter((p) => (p.category ?? 'Altro') === selectedCategory)

  return (
    <div>
      {/* Category filter pills */}
      {categories.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 4,
            marginBottom: 20,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <button
            type="button"
            onClick={() => setSelectedCategory(null)}
            style={{
              flexShrink: 0,
              padding: '7px 16px',
              borderRadius: 100,
              border: '1.5px solid',
              borderColor: selectedCategory == null ? 'var(--brand-primary, #222)' : '#E5E5E5',
              backgroundColor: selectedCategory == null ? 'var(--brand-primary, #222)' : '#FFFFFF',
              color: selectedCategory == null ? '#FFFFFF' : '#555',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Tutti
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 100,
                border: '1.5px solid',
                borderColor: selectedCategory === cat ? 'var(--brand-primary, #222)' : '#E5E5E5',
                backgroundColor: selectedCategory === cat ? 'var(--brand-primary, #222)' : '#FFFFFF',
                color: selectedCategory === cat ? '#FFFFFF' : '#555',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((product) => (
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
            {/* Clickable area → detail */}
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

            {/* Product image */}
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

            {/* Product info */}
            <div style={{ flex: 1, minWidth: 0, zIndex: 1 }}>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: '#222',
                  marginBottom: 2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {product.name}
              </p>
              {product.brand && (
                <p style={{ fontSize: 12, color: '#B0B0B0', marginBottom: 4 }}>{product.brand}</p>
              )}
              {/* Availability dot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: product.available ? '#22C55E' : '#D1D5DB',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 11, color: product.available ? '#16A34A' : '#9CA3AF' }}>
                  {product.available ? 'Disponibile' : 'Non disponibile'}
                </span>
              </div>
            </div>

            {/* Price + favorite */}
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
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--brand-primary, #222)',
                  }}
                >
                  {formatPrice(product.price_sell)}
                </p>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  void toggle(product.id)
                }}
                aria-label={isFavorite(product.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  border: 'none',
                  background: isFavorite(product.id)
                    ? 'var(--brand-primary, #222)'
                    : '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
              >
                <Heart
                  size={16}
                  color={isFavorite(product.id) ? '#FFFFFF' : '#9CA3AF'}
                  fill={isFavorite(product.id) ? '#FFFFFF' : 'none'}
                  strokeWidth={2}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div
          style={{
            paddingTop: 40,
            textAlign: 'center',
            color: '#B0B0B0',
            fontSize: 14,
          }}
        >
          Nessun prodotto in questa categoria.
        </div>
      )}
    </div>
  )
}
