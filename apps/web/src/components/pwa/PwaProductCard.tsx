import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, ShoppingBag } from 'lucide-react'

export interface PwaProductCardProps {
  name: string
  brand?: string | null
  description?: string | null
  photo_url?: string | null
  price_sell: number
  available?: boolean
  detailHref: string
  imageSize?: string
  style?: CSSProperties
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

export function PwaProductCard({
  name,
  brand,
  description,
  photo_url,
  price_sell,
  available = true,
  detailHref,
  imageSize = '(max-width: 640px) 47vw, 300px',
  style,
}: PwaProductCardProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #F0F0F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        opacity: available ? 1 : 0.55,
        overflow: 'hidden',
        minWidth: 0,
        ...style,
      }}
    >
      {/* Full-card link — behind everything */}
      <Link
        href={detailHref}
        style={{ position: 'absolute', inset: 0, zIndex: 0 }}
        aria-label={`Vedi dettagli ${name}`}
      />

      {/* Inset image — mirrors ProdottiClient */}
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
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShoppingBag size={28} color="#D0D0D0" />
          </div>
        )}
      </div>

      {/* Card body */}
      <div
        style={{
          padding: '10px 12px 12px',
          position: 'relative',
          zIndex: 1,
          minWidth: 0,
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: '#111',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginBottom: 2,
            lineHeight: 1.3,
          }}
        >
          {name}
        </p>

        {description ? (
          <p
            style={{
              fontSize: 11,
              color: '#B0B0B0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {description}
          </p>
        ) : brand ? (
          <p
            style={{
              fontSize: 11,
              color: '#B0B0B0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 8,
              lineHeight: 1.4,
            }}
          >
            {brand}
          </p>
        ) : null}

        {/* Price + arrow */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: !description && !brand ? 4 : 0,
          }}
        >
          <p
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: price_sell > 0 ? '#111' : 'transparent',
            }}
          >
            {price_sell > 0 ? formatPrice(price_sell) : '—'}
          </p>

          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'var(--brand-primary, #111)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ArrowUpRight size={16} color="#FFFFFF" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}
