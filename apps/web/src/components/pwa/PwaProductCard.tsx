'use client'

import type { CSSProperties } from 'react'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Heart, ShoppingBag } from 'lucide-react'

export interface PwaProductCardProps {
  name: string
  brand?: string | null
  description?: string | null
  photo_url?: string | null
  price_sell: number
  available?: boolean
  lowStock?: boolean
  detailHref: string
  imageSize?: string
  style?: CSSProperties
  /** Set to trigger entrance animation; value is the delay in ms. Omit for static render (home scroll). */
  animationDelay?: number
  isFavorite?: boolean
  /** Provide to show the heart / wishlist button. */
  onFavoriteToggle?: (() => void) | null
}

// Namespaced classes → no collisions. Duplicate <style> tags across instances are idempotent.
const CARD_CSS = `
  @keyframes pwa-product-in {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .pwa-pc-anim { animation: pwa-product-in 380ms ease-out both; }
  .pwa-pc-link:focus-visible {
    outline: 2px solid var(--brand-primary, #111);
    outline-offset: 3px;
    border-radius: 20px;
  }
  .pwa-pc-heart { transition: background 150ms ease; }
  .pwa-pc-heart:active { transform: scale(0.82) !important; }
  @media (prefers-reduced-motion: reduce) {
    .pwa-pc-anim { animation: none !important; opacity: 1 !important; }
    .pwa-pc-heart { transition: none !important; }
    .pwa-pc-heart:active { transform: none !important; }
  }
`

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(12)
  }
}

export function PwaProductCard({
  name,
  brand,
  description,
  photo_url,
  price_sell,
  available = true,
  lowStock = false,
  detailHref,
  imageSize = '(max-width: 640px) 47vw, 300px',
  style,
  animationDelay,
  isFavorite = false,
  onFavoriteToggle,
}: PwaProductCardProps) {
  const [pressed, setPressed] = useState(false)
  const withAnimation = animationDelay !== undefined

  return (
    <>
      <style>{CARD_CSS}</style>
      <div
        className={withAnimation ? 'pwa-pc-anim' : undefined}
        onPointerDown={() => { setPressed(true); haptic() }}
        onPointerUp={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          position: 'relative',
          background: '#FFFFFF',
          borderRadius: 20,
          boxShadow: pressed ? '0 2px 10px rgba(0,0,0,0.10)' : '0 8px 40px rgba(0,0,0,0.18)',
          opacity: available ? 1 : 0.55,
          minWidth: 0,
          transform: pressed ? 'scale(0.965)' : undefined,
          transition: 'transform 120ms ease, box-shadow 120ms ease',
          WebkitTapHighlightColor: 'transparent',
          ...(withAnimation ? { animationDelay: `${animationDelay}ms` } : {}),
          ...style,
        }}
      >
        {/* Full-card link — behind everything */}
        <Link
          href={detailHref}
          className="pwa-pc-link"
          style={{ position: 'absolute', inset: 0, zIndex: 0, WebkitTapHighlightColor: 'transparent' }}
          aria-label={`Vedi dettagli ${name}`}
        />

        {/* Inset image — borderRadius 12 = outer 20 minus the 8px margin on each side */}
        <div
          style={{
            position: 'relative',
            margin: '8px 8px 0 8px',
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '1 / 1',
            background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
            pointerEvents: 'none',
          }}
        >
          {photo_url ? (
            <Image
              src={photo_url}
              alt={name}
              fill
              className="object-cover"
              sizes={imageSize}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={28} color="#D0D0D0" />
            </div>
          )}

          {lowStock && (
            <div
              style={{
                position: 'absolute', top: 8, left: 8, zIndex: 1,
                padding: '3px 8px', borderRadius: 100,
                background: '#EF4444', color: '#FFFFFF',
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >
              Stock basso
            </div>
          )}

          {onFavoriteToggle != null && (
            <button
              type="button"
              className="pwa-pc-heart"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.preventDefault(); onFavoriteToggle() }}
              aria-label={isFavorite ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
              style={{
                position: 'absolute', top: 8, right: 8, zIndex: 2,
                width: 44, height: 44, borderRadius: '50%', border: 'none',
                background: isFavorite ? 'var(--brand-primary, #111)' : 'rgba(255,255,255,0.88)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
                pointerEvents: 'auto', WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Heart
                size={14}
                color={isFavorite ? '#FFFFFF' : 'var(--brand-primary, #111)'}
                fill={isFavorite ? '#FFFFFF' : 'none'}
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {/* Card body */}
        <div style={{ padding: '10px 12px 12px', position: 'relative', zIndex: 1, minWidth: 0, pointerEvents: 'none' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, lineHeight: 1.3 }}>
            {name}
          </p>

          {(description || brand) && (
            <p style={{ fontSize: 11, color: '#B0B0B0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 8, lineHeight: 1.4 }}>
              {description ?? brand}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: !description && !brand ? 4 : 0 }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: price_sell > 0 ? '#111' : 'transparent' }}>
              {price_sell > 0 ? formatPrice(price_sell) : '—'}
            </p>
            <div
              aria-hidden="true"
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-primary, #111)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <ArrowUpRight size={16} color="#FFFFFF" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
