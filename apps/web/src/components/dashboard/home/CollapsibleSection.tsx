'use client'

import * as React from 'react'

const BADGE_COLORS = {
  red:    { bg: '#FEE2E2', color: '#DC2626' },
  yellow: { bg: '#FEF3C7', color: '#D97706' },
  green:  { bg: '#D1FAE5', color: '#059669' },
  gray:   { bg: '#F3F4F6', color: '#6B7280' },
}

interface Props {
  title: string
  subtitle?: string
  badge?: number | string
  badgeVariant?: 'red' | 'yellow' | 'green' | 'gray'
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsibleSection({
  title,
  subtitle,
  badge,
  badgeVariant = 'gray',
  children,
}: Props) {
  const bc = BADGE_COLORS[badgeVariant]

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.07)',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* Header — always visible, non-interactive */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 20px',
        borderBottom: '1px solid rgba(0,0,0,0.07)',
        fontFamily: 'Outfit, sans-serif',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#111111',
              letterSpacing: '-0.2px',
            }}>
              {title}
            </span>
            {badge != null && (
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: 99,
                background: bc.bg,
                color: bc.color,
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.4,
              }}>
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <div style={{
              fontSize: 12,
              color: '#9CA3AF',
              marginTop: 3,
              fontFamily: 'Outfit, sans-serif',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Content — always visible */}
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  )
}
