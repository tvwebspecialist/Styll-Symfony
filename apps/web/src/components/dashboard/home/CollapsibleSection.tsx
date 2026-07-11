'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'

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
  defaultOpen = false,
  children,
}: Props) {
  const [open, setOpen] = React.useState(defaultOpen)
  const bc = BADGE_COLORS[badgeVariant]

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid rgba(0,0,0,0.07)',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '16px 20px',
          background: 'transparent',
          border: 'none',
          borderBottom: open ? '1px solid var(--card-border, #E9E9E9)' : '1px solid transparent',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'border-color 0.2s',
          WebkitTapHighlightColor: 'rgba(0,0,0,0)',
          outline: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: 'Outfit, sans-serif',
          }}>
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
        <ChevronDown
          size={18}
          color="#9CA3AF"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.25s ease',
          }}
        />
      </button>

      <div style={{
        overflow: 'hidden',
        maxHeight: open ? '3000px' : '0px',
        transition: 'max-height 0.32s ease',
      }}>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
