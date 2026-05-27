'use client'

import Image from 'next/image'
import type { LandingProduct } from '@/types/landing'

interface Props {
  product: LandingProduct
}

function formatPrice(price: number): string {
  return `${price.toFixed(2)}€`
}

function getProductInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

function getProductSupportingText(product: LandingProduct): string | null {
  const description = product.description?.trim()
  if (description) return description

  const brand = product.brand?.trim()
  return brand || null
}

export default function ProductCard({ product }: Props) {
  const supportingText = getProductSupportingText(product)

  return (
    <article
      className="group relative h-full overflow-hidden rounded-[24px] bg-[#1A1A1A] shadow-[0_12px_36px_rgba(0,0,0,0.14)]"
      style={{ aspectRatio: '3 / 4' }}
    >
      {product.photo_url ? (
        <Image
          fill
          src={product.photo_url}
          alt={product.name}
          className="object-cover object-center transition-transform duration-300 ease-out group-hover:scale-[1.02]"
          sizes="(max-width: 639px) 83vw, (max-width: 1023px) 38vw, 26vw"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A] text-white select-none"
          style={{ fontSize: '3.5rem', fontWeight: 800 }}
          aria-label={product.name}
        >
          {getProductInitial(product.name)}
        </div>
      )}

      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.24) 32%, rgba(0,0,0,0.85) 100%)',
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 sm:p-6">
        <h3
          className="m-0 text-white"
          style={{
            fontSize: 'clamp(1.125rem, 1.9vw, 1.375rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}
        >
          {product.name}
        </h3>

        {supportingText ? (
          <p
            className="m-0 text-white/75"
            style={{
              fontSize: '0.875rem',
              lineHeight: 1.45,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {supportingText}
          </p>
        ) : null}

        <p
          className="m-0 pt-1 text-white"
          style={{
            fontSize: '1.0625rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
          }}
        >
          {formatPrice(product.price_sell)}
        </p>
      </div>
    </article>
  )
}
