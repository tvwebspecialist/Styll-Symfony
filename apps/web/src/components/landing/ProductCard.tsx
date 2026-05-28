'use client'

import * as React from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import type { LandingProduct } from '@/types/landing'

interface Props {
  product: LandingProduct
  primaryColor: string
}

function formatPrice(price: number): string {
  return `€${price.toFixed(2)}`
}

export default function ProductCard({ product, primaryColor }: Props) {
  return (
    <article
      style={{
        position: 'relative',
        borderRadius: 28,
        overflow: 'hidden',
        aspectRatio: '3 / 4',
        cursor: 'default',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.22)',
        isolation: 'isolate',
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
            display: 'block',
          }}
          sizes="(max-width: 639px) 90vw, (max-width: 1023px) 44vw, 30vw"
          loading="lazy"
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #c8c8c8 0%, #a0a0a0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.35)',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Apple-style white glass panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '18px 18px 22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'rgba(255, 255, 255, 0.28)',
          backdropFilter: 'blur(32px) saturate(200%) brightness(1.08)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%) brightness(1.08)',
          borderTop: '1px solid rgba(255, 255, 255, 0.55)',
        }}
      >
        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#111111',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {product.name}
        </h3>

        {/* Brand with icon */}
        {product.brand?.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Package size={14} color="rgba(0,0,0,0.45)" strokeWidth={1.5} />
            <span
              style={{
                fontSize: 13,
                color: 'rgba(0,0,0,0.45)',
                fontWeight: 400,
                letterSpacing: '0.01em',
              }}
            >
              {product.brand.trim()}
            </span>
          </div>
        )}

        {/* Divider */}
        <div
          aria-hidden="true"
          style={{ height: 1, background: 'rgba(0, 0, 0, 0.10)' }}
        />

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Price pill */}
          <div
            style={{
              flexShrink: 0,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.10)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 0, 0, 0.08)',
              color: '#111111',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: '-0.2px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {formatPrice(product.price_sell)}
          </div>

          {/* CTA pill */}
          <div
            style={{
              flex: 1,
              padding: '12px 18px',
              borderRadius: 999,
              background: '#111111',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Scopri
          </div>
        </div>
      </div>
    </article>
  )
}
