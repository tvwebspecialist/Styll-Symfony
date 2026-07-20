'use client'

import { useState } from 'react'
import { PwaProductCard } from '@/components/pwa/PwaProductCard'
import { useFavoriteProducts } from '@/lib/hooks/use-favorite-products'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { formatCategoryLabel } from '@/lib/utils'

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
        .prodotti-filter-pill { transition: background 180ms ease, color 180ms ease, box-shadow 180ms ease; }
        @media (prefers-reduced-motion: reduce) {
          .prodotti-filter-pill { transition: none !important; }
        }
        .prodotti-filters::-webkit-scrollbar { display: none; }
      `}</style>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div
          className="prodotti-filters"
          style={{
            display: 'flex',
            gap: 7,
            overflowX: 'auto',
            paddingBottom: 14,
            marginBottom: 6,
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {(['__all__', ...categories] as const).map((cat) => {
            const isAll = cat === '__all__'
            const active = isAll ? selectedCategory == null : selectedCategory === cat
            const label = isAll ? 'Tutti' : formatCategoryLabel(cat)
            return (
              <button
                key={cat}
                type="button"
                className="prodotti-filter-pill"
                onClick={() => selectCategory(isAll ? null : (cat === selectedCategory ? null : cat as string))}
                style={{
                  flexShrink: 0,
                  padding: '8px 18px',
                  borderRadius: 100,
                  border: 'none',
                  backgroundColor: active ? 'var(--brand-primary, #111)' : 'rgba(0,0,0,0.06)',
                  color: active ? '#FFFFFF' : 'rgba(0,0,0,0.55)',
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: active ? '-0.1px' : '0',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  boxShadow: active ? '0 3px 10px rgba(0,0,0,0.18)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* 2-column product grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 12,
        }}
      >
        {filtered.map((product, index) => (
          <PwaProductCard
            key={`${product.id}-${animationEpoch}`}
            name={product.name}
            brand={product.brand}
            description={product.description}
            photo_url={product.photo_url}
            price_sell={product.price_sell}
            available={product.available}
            lowStock={product.lowStock}
            detailHref={tenantPath(`/prodotti/${product.id}`)}
            imageSize="(max-width: 640px) 47vw, 300px"
            animationDelay={index * 55}
            isFavorite={isFavorite(product.id)}
            onFavoriteToggle={() => void toggle(product.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ paddingTop: 40, textAlign: 'center', color: '#B0B0B0', fontSize: 14 }}>
          Nessun prodotto in questa categoria.
        </div>
      )}
    </div>
  )
}
