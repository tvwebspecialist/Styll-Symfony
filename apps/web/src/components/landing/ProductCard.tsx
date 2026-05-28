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
        boxShadow: '0 16px 48px rgba(0, 0, 0, 0.18)',
        background: '#1A1A1A',
      }}
    >
      {/* Photo or placeholder */}
      {product.photo_url ? (
        <Image
          fill
          src={product.photo_url}
          alt={product.name}
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          sizes="(max-width: 639px) 83vw, (max-width: 1023px) 38vw, 26vw"
          loading="lazy"
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.08)',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Gradient overlay — covers bottom 68% */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '68%',
          background:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.45) 35%, rgba(0,0,0,0.88) 100%)',
        }}
      />

      {/* Content area */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 20px 22px 20px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Carousel indicator dots */}
        <div
          aria-hidden="true"
          style={{ display: 'flex', justifyContent: 'center', gap: 5, marginBottom: 14 }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background:
                  i === 0 ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.32)',
              }}
            />
          ))}
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 7px 0',
            fontSize: 21,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {product.name}
        </h3>

        {/* Brand with icon */}
        {product.brand?.trim() && (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}
          >
            <Package size={14} color="rgba(255,255,255,0.60)" strokeWidth={1.5} />
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.60)',
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
          style={{
            height: 1,
            background: 'rgba(255,255,255,0.18)',
            marginBottom: 14,
          }}
        />

        {/* Buttons row */}
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Price pill */}
          <div
            style={{
              flexShrink: 0,
              padding: '13px 20px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.20)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              color: '#FFFFFF',
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
              padding: '13px 20px',
              borderRadius: 999,
              background: '#FFFFFF',
              color: '#111111',
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
