'use client'

import * as React from 'react'
import Image from 'next/image'
import type { LandingProduct } from '@/types/landing'

interface Props {
  product: LandingProduct
}

function formatPrice(price: number): string {
  return `€${price.toFixed(2)}`
}

export default function ProductCard({ product }: Props) {
  const [hovered, setHovered] = React.useState(false)

  const supportingText = product.description?.trim() || product.brand?.trim() || null

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        aspectRatio: '3 / 4',
        cursor: 'default',
        boxShadow: hovered
          ? '0 16px 48px rgba(0, 0, 0, 0.20)'
          : '0 8px 32px rgba(0, 0, 0, 0.12)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        willChange: 'transform',
      }}
    >
      {/* Photo or initials placeholder */}
      {product.photo_url ? (
        <Image
          fill
          src={product.photo_url}
          alt={product.name}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1A1A1A',
            fontSize: 32,
            fontWeight: 800,
            color: '#FFFFFF',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Gradient overlay — bottom 50%, no backdrop-filter */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.75) 100%)',
        }}
      />

      {/* Name + supporting text + price */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 20px 24px 20px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {product.name}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
          }}
        >
          {supportingText && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.75)',
              }}
            >
              {supportingText}
            </span>
          )}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            {formatPrice(product.price_sell)}
          </span>
        </div>
      </div>
    </article>
  )
}
