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

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        aspectRatio: '3 / 4',
        cursor: 'default',
        background: '#0D0D0D',
        boxShadow: hovered
          ? '0 24px 64px rgba(0, 0, 0, 0.32)'
          : '0 8px 32px rgba(0, 0, 0, 0.16)',
        transform: hovered ? 'translateY(-5px)' : 'translateY(0)',
        transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.35s ease',
        willChange: 'transform',
      }}
    >
      {/* Photo fills entire card */}
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
            fontSize: 40,
            fontWeight: 800,
            color: '#FFFFFF',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Feather: photo fades into the panel */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: '38%',
          height: 64,
          background: 'linear-gradient(to bottom, rgba(13,13,13,0) 0%, rgba(13,13,13,1) 100%)',
        }}
      />

      {/* Info panel — solid dark, bottom 38% */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '38%',
          background: '#0D0D0D',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px 18px 18px',
        }}
      >
        {/* Brand + name + description */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {product.brand?.trim() && (
            <p
              style={{
                margin: '0 0 3px',
                fontSize: 10,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.38)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              {product.brand.trim()}
            </p>
          )}
          <p
            style={{
              margin: 0,
              fontSize: 19,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.15,
              letterSpacing: '-0.3px',
            }}
          >
            {product.name}
          </p>
          {product.description?.trim() && (
            <p
              style={{
                margin: '5px 0 0',
                fontSize: 12,
                color: 'rgba(255,255,255,0.44)',
                lineHeight: 1.45,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } as React.CSSProperties}
            >
              {product.description.trim()}
            </p>
          )}
        </div>

        {/* Price — separated by a divider */}
        <div
          style={{
            borderTop: '1px solid rgba(255,255,255,0.08)',
            paddingTop: 10,
            marginTop: 8,
          }}
        >
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
              lineHeight: 1,
            }}
          >
            {formatPrice(product.price_sell)}
          </span>
        </div>
      </div>
    </article>
  )
}
