'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LandingProduct } from '@/types/landing'

interface Props {
  products: LandingProduct[]
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(price)
}

function ProductCard({ product }: { product: LandingProduct }) {
  const initial = product.name.charAt(0).toUpperCase()

  return (
    <article
      className="relative shrink-0 overflow-hidden rounded-2xl bg-[#1a1a1a]"
      style={{ width: '200px', aspectRatio: '3/4' }}
    >
      {product.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={product.photo_url}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-cover block"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center font-black text-white select-none"
          style={{ background: 'var(--brand-primary)', fontSize: '3.5rem' }}
          aria-label={product.name}
        >
          {initial}
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.15) 50%, transparent 75%)' }}
        aria-hidden="true"
      />

      {/* Name + price */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        {product.brand && (
          <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wider mb-1">
            {product.brand}
          </p>
        )}
        <p
          className="font-bold text-white text-sm leading-snug mb-1 overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as React.CSSProperties}
        >
          {product.name}
        </p>
        <p className="font-black text-white text-[15px]">{formatPrice(product.price_sell)}</p>
      </div>
    </article>
  )
}

export default function LandingProducts({ products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (!products.length) return null

  function scrollTrack(direction: 'left' | 'right') {
    if (!trackRef.current) return
    trackRef.current.scrollBy({
      left: direction === 'left' ? -440 : 440,
      behavior: 'smooth',
    })
  }

  return (
    <section id="prodotti" aria-label="I nostri prodotti" className="w-full bg-white py-20 sm:py-24 overflow-hidden">

      {/* Header row */}
      <div className="w-full max-w-[1120px] mx-auto px-5 mb-8 flex items-end justify-between gap-6">
        <div>
          <h2
            className="font-black text-[#111]"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}
          >
            Cosa offriamo
          </h2>
          <p className="text-[#888] text-sm mt-1.5">I nostri prodotti</p>
        </div>

        {/* Navigation arrows */}
        {products.length > 3 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => scrollTrack('left')}
              aria-label="Precedente"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#111] text-white hover:bg-[#333] transition-colors shrink-0"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => scrollTrack('right')}
              aria-label="Successivo"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-[#111] text-white hover:bg-[#333] transition-colors shrink-0"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal scroll track */}
      <div
        ref={trackRef}
        className="flex overflow-x-auto gap-4 px-5"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          paddingLeft: 'max(20px, calc((100vw - 1120px) / 2 + 20px))',
          paddingRight: 'max(20px, calc((100vw - 1120px) / 2 + 20px))',
        } as React.CSSProperties}
        role="list"
        aria-label="Lista prodotti"
      >
        {products.map((product) => (
          <div key={product.id} role="listitem" style={{ scrollSnapAlign: 'start' }}>
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
