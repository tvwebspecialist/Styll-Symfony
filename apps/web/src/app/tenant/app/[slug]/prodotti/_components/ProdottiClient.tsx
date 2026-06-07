'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react'
import { useFavoriteProducts } from '@/lib/hooks/use-favorite-products'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

export interface ProductListItem {
  id: string
  name: string
  brand: string | null
  category: string | null
  description: string | null
  photo_url: string | null
  price_sell: number
  available: boolean
  lowStock: boolean
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
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
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
            marginBottom: 16,
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

      {/* 2-column product grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        {filtered.map((product) => (
          <div
            key={product.id}
            style={{
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #F0F0F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              overflow: 'hidden',
              opacity: product.available ? 1 : 0.55,
            }}
          >
            {/* Full-card link — behind everything */}
            <Link
              href={tenantPath(`/prodotti/${product.id}`)}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
              }}
              aria-label={`Vedi dettagli ${product.name}`}
            />

            {/* Square image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                background: '#F5F5F5',
                overflow: 'hidden',
              }}
            >
              {product.photo_url ? (
                <Image
                  src={product.photo_url}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 47vw, 300px"
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
                  <ShoppingBag size={28} color="#D0D0D0" />
                </div>
              )}

              {/* STOCK BASSO badge */}
              {product.lowStock && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 1,
                    padding: '3px 8px',
                    borderRadius: 100,
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Stock basso
                </div>
              )}

              {/* Heart favorites button */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  void toggle(product.id)
                }}
                aria-label={
                  isFavorite(product.id) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'
                }
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 2,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: 'none',
                  background: isFavorite(product.id)
                    ? 'var(--brand-primary, #111)'
                    : 'rgba(255,255,255,0.88)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                  transition: 'background 150ms',
                }}
              >
                <Heart
                  size={14}
                  color={isFavorite(product.id) ? '#FFFFFF' : 'var(--brand-primary, #111)'}
                  fill={isFavorite(product.id) ? '#FFFFFF' : 'none'}
                  strokeWidth={2}
                />
              </button>
            </div>

            {/* Card body */}
            <div style={{ padding: '10px 12px 12px', position: 'relative', zIndex: 1 }}>
              {/* Name */}
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#111',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 2,
                  lineHeight: 1.3,
                }}
              >
                {product.name}
              </p>

              {/* Brand */}
              {product.brand && (
                <p
                  style={{
                    fontSize: 11,
                    color: '#9CA3AF',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: product.description ? 4 : 8,
                  }}
                >
                  {product.brand}
                </p>
              )}

              {/* Description */}
              {product.description && (
                <p
                  style={{
                    fontSize: 11,
                    color: '#B0B0B0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {product.description}
                </p>
              )}

              {/* Price + arrow */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: !product.brand && !product.description ? 4 : 0,
                }}
              >
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: product.price_sell > 0 ? '#111' : 'transparent',
                  }}
                >
                  {product.price_sell > 0 ? formatPrice(product.price_sell) : '—'}
                </p>

                {/* Arrow button — visual only, navigation handled by the card Link */}
                <div
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--brand-primary, #111)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ArrowRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </div>
              </div>
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
