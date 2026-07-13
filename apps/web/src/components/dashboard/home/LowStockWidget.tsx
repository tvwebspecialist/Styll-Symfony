'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Package } from 'lucide-react'
import type { LowStockProduct } from '@/lib/actions/dashboard-home'

interface Props {
  products: LowStockProduct[]
  basePath: string
}

export function LowStockWidget({ products, basePath }: Props) {
  const router = useRouter()
  if (products.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {products.map((p) => {
        const isRed = p.risk === 'red'
        const iconBg = isRed ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)'
        const iconColor = isRed ? '#DC2626' : '#D97706'
        const pillBg = isRed ? '#FEE2E2' : '#FEF3C7'
        const pillColor = isRed ? '#DC2626' : '#D97706'
        const qtyLabel = p.quantity === 0 ? 'Esaurito' : `Qty: ${p.quantity}`

        return (
          <div
            key={p.product_id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`${basePath}/catalogo`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/catalogo`) }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              background: 'var(--card-bg, #FFFFFF)',
              borderRadius: 10,
              border: '1px solid var(--card-border, #E9E9E9)',
              cursor: 'pointer',
              outline: 'none',
              WebkitTapHighlightColor: 'rgba(0,0,0,0)',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F7F7F7' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--card-bg, #FFFFFF)' }}
          >
            {/* Thumbnail / icon */}
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: p.photo_url ? 'transparent' : iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {p.photo_url
                ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <Package size={15} color={iconColor} strokeWidth={2} />
              }
            </div>

            {/* Name + threshold */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: '#111111',
                fontFamily: 'Outfit, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.2,
              }}>
                {p.name}
              </p>
              <p style={{
                margin: 0,
                fontSize: 10,
                color: '#9CA3AF',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.3,
                marginTop: 1,
              }}>
                Soglia: {p.low_stock_threshold}
              </p>
            </div>

            {/* Qty pill */}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: 99,
              background: pillBg,
              color: pillColor,
              fontFamily: 'Outfit, sans-serif',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}>
              {qtyLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
