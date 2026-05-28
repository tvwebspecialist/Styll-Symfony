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
        borderRadius: 24,
        overflow: 'hidden',
        aspectRatio: '3 / 4',
        width: '100%',
        maxWidth: 380,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.16)',
      }}
    >
      {/* Photo */}
      {product.photo_url ? (
        <Image
          fill
          src={product.photo_url}
          alt={product.name}
          style={{ objectFit: 'cover', objectPosition: 'center', display: 'block' }}
          sizes="(max-width: 639px) 90vw, (max-width: 1023px) 44vw, 380px"
          loading="lazy"
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, #d0d0d0 0%, #a8a8a8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 72,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.40)',
            userSelect: 'none',
          }}
          aria-label={product.name}
        >
          {product.name.trim().charAt(0).toUpperCase() || '?'}
        </div>
      )}

      {/* Layer 1 — gradient scuro dal basso, copre 65% */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '65%',
          background:
            'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.60) 30%, rgba(0,0,0,0.20) 60%, rgba(0,0,0,0) 100%)',
        }}
      />

      {/* Layer 2 — blur solo sul 45% inferiore, sfuma verso l'alto con mask */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '45%',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          maskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 60%, transparent 100%)',
        }}
      />

      {/* Contenuto — sopra entrambi i layer */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 18px 22px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {/* Nome prodotto */}
        <h3
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
        </h3>

        {/* Brand */}
        {product.brand?.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Package size={13} color="rgba(255,255,255,0.70)" strokeWidth={1.5} />
            <span
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.70)',
                fontWeight: 400,
              }}
            >
              {product.brand.trim()}
            </span>
          </div>
        )}

        {/* Pulsanti */}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          {/* Prezzo */}
          <div
            style={{
              flexShrink: 0,
              padding: '12px 18px',
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.40)',
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

          {/* CTA */}
          <div
            style={{
              flex: 1,
              padding: '12px 18px',
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
