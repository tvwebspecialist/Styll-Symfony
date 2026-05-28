'use client'

import * as React from 'react'
import Image from 'next/image'
import type { LandingProduct } from '@/types/landing'

interface Props {
  product: LandingProduct
  primaryColor: string
}

function formatPrice(price: number): string {
  return `€${price.toFixed(2)}`
}

export default function ProductCard({ product, primaryColor }: Props) {
  const [hovered, setHovered] = React.useState(false)

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
      {/* Photo or placeholder */}
      {product.photo_url ? (
        <Image
          fill
          src={product.photo_url}
          alt={product.name}
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
            transform: hovered ? 'scale(1.04)' : 'scale(1)',
            transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
          sizes="(max-width: 639px) 83vw, (max-width: 1023px) 38vw, 26vw"
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
            fontSize: 48,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.15)',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Gradient overlay — bottom 55%, like TeamCard */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.30) 30%, rgba(0,0,0,0.80) 100%)',
        }}
      />

      {/* Text overlay — bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 20px 24px 20px',
        }}
      >
        {product.brand?.trim() && (
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 10,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.50)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {product.brand.trim()}
          </p>
        )}

        <p
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {product.name}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', marginTop: 8 }}>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: primaryColor,
              lineHeight: 1,
              letterSpacing: '-0.3px',
            }}
          >
            {formatPrice(product.price_sell)}
          </span>
        </div>
      </div>
    </article>
  )
}
