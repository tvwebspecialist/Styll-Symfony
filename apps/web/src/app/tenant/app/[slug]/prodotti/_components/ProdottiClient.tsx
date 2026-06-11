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
  const [animationEpoch, setAnimationEpoch] = useState(0)
  const { isFavorite, toggle } = useFavoriteProducts({
    isLoggedIn,
    clientId,
    tenantId,
    slug,
    initialIds: initialWishlistIds,
  })
  const tenantPath = useTenantPath(slug)

  function selectCategory(cat: string | null) {
    setSelectedCategory(cat)
    setAnimationEpoch((e) => e + 1)
  }

  const filtered =
    selectedCategory == null
      ? products
      : products.filter((p) => (p.category ?? 'Altro') === selectedCategory)

  return (
    <div>
      <style>{`
        @keyframes prodotti-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @media (prefers-reduced-motion: reduce) {
          .prodotti-card { animation: none !important; opacity: 1 !important; }
        }
        .prodotti-filters::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div
          className="prodotti-filters"
          style={{
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            paddingBottom: 12,
            marginBottom: 8,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(['__all__', ...categories] as const).map((cat) => {
            const isAll = cat === '__all__'
            const active = isAll ? selectedCategory == null : selectedCategory === cat
            const label = isAll ? 'Tutti' : cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(isAll ? null : (cat === selectedCategory ? null : cat as string))}
                style={{
                  flexShrink: 0,
                  padding: '8px 18px',
                  borderRadius: 100,
                  border: '1.5px solid',
                  borderColor: active ? 'var(--brand-primary, #222)' : 'transparent',
                  backgroundColor: active ? 'var(--brand-primary, #222)' : '#F2F2F2',
                  color: active ? '#FFFFFF' : '#444',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 200ms, color 200ms, border-color 200ms',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 2-column product grid — always rigid 2 cols */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((product, index) => (
          <div
            key={`${product.id}-${animationEpoch}`}
            className="prodotti-card"
            style={{
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: 20,
              border: '1px solid #F0F0F0',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              opacity: product.available ? 1 : 0.55,
              minWidth: 0,
              animationName: 'prodotti-in',
              animationDuration: '380ms',
              animationTimingFunction: 'ease-out',
              animationFillMode: 'both',
              animationDelay: `${index * 55}ms`,
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

            {/* Inset image — floated inside card, mirrors dashboard ProdottoCard */}
            <div
              style={{
                position: 'relative',
                margin: '8px 8px 0 8px',
                borderRadius: 12,
                overflow: 'hidden',
                aspectRatio: '1 / 1',
                background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                pointerEvents: 'none',
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
                  pointerEvents: 'auto',
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
            <div style={{ padding: '10px 12px 12px', position: 'relative', zIndex: 1, minWidth: 0, pointerEvents: 'none' }}>
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
                  marginTop: !product.description ? 4 : 0,
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

                {/* Arrow — visual only, navigation handled by card Link */}
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
