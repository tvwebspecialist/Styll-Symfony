'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import ProductCard from '@/components/landing/ProductCard'
import type { LandingProduct, LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
  products: LandingProduct[]
}

export default function LandingProducts({ tenant, products }: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(products.length > 1)

  const updateScrollState = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const maxScrollLeft = track.scrollWidth - track.clientWidth
    setCanScrollPrev(track.scrollLeft > 8)
    setCanScrollNext(maxScrollLeft - track.scrollLeft > 8)
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    updateScrollState()

    track.addEventListener('scroll', updateScrollState, { passive: true })
    window.addEventListener('resize', updateScrollState)

    return () => {
      track.removeEventListener('scroll', updateScrollState)
      window.removeEventListener('resize', updateScrollState)
    }
  }, [products.length, updateScrollState])

  const scrollTrack = useCallback((direction: 'left' | 'right') => {
    const track = trackRef.current
    if (!track) return

    const scrollAmount = Math.max(track.clientWidth * 0.82, 280)
    track.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }, [])

  if (!products.length) return null

  return (
    <section
      id="prodotti"
      aria-label="I nostri prodotti"
      className="w-full overflow-hidden py-20 sm:py-24"
    >
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-8 px-5" style={{ background: 'transparent' }}>
        <div className="flex items-start justify-between gap-6">
          <div>
            <h2
              className="m-0 text-[#111111]"
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                marginBottom: 0,
              }}
            >
              Cosa offriamo
            </h2>
            <p className="mt-2 mb-0 text-sm font-medium text-[#6F6F6F]">I nostri prodotti</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => scrollTrack('left')}
              aria-label="Prodotti precedenti"
              aria-controls="products-track"
              disabled={!canScrollPrev}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A] text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronLeft size={18} strokeWidth={2.25} />
            </button>
            <button
              type="button"
              onClick={() => scrollTrack('right')}
              aria-label="Prodotti successivi"
              aria-controls="products-track"
              disabled={!canScrollNext}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1A1A1A] text-white transition-opacity duration-200 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ChevronRight size={18} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div
          id="products-track"
          ref={trackRef}
          className="flex items-start snap-x snap-mandatory gap-4 overflow-x-auto lg:gap-5"
          style={{
            background: 'transparent',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
          role="list"
          aria-label="Lista prodotti"
        >
          {products.map((product) => (
            <div
              key={product.id}
              role="listitem"
              className="shrink-0 basis-[90%] snap-start sm:basis-[46%] lg:basis-[32%]"
              style={{ background: 'transparent' }}
            >
              <ProductCard product={product} primaryColor={tenant.primary_color} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
