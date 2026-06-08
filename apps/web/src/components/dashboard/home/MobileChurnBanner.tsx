'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { AtRiskClient } from '@/lib/actions/dashboard-home'

interface Props {
  clients: AtRiskClient[]
  basePath: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export function MobileChurnBanner({ clients, basePath }: Props) {
  const router = useRouter()
  const shown  = clients.slice(0, 5)

  if (shown.length === 0) return null

  return (
    <div>
      {/* Section label */}
      <p style={{
        margin: '0 0 10px',
        fontSize: 13,
        fontWeight: 700,
        color: '#111111',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.1px',
      }}>
        ⚠️ Clienti che stai perdendo
      </p>

      {/* Horizontal scroll strip */}
      <div
        className="home-mobile-churn-scroll"
        style={{
          display: 'flex',
          gap: 10,
          overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        }}
      >
        {shown.map((c) => {
          const isRed      = c.churn_status === 'red' || c.days_since > 35
          const accentTop  = isRed ? '#EF4444' : '#F59E0B'
          const accentBg   = isRed ? '#fee2e2' : '#fef3c7'
          const accentText = isRed ? '#b91c1c' : '#92400e'
          const avatarBg   = accentBg
          const avatarText = accentText

          return (
            <div
              key={c.client_id}
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0F0F0',
                borderTop: `3px solid ${accentTop}`,
                borderRadius: 14,
                padding: '10px 12px',
                minWidth: 148,
                maxWidth: 160,
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                boxSizing: 'border-box',
              }}
            >
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: avatarBg,
                  color: avatarText,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {getInitials(c.full_name)}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#111111',
                  fontFamily: 'Outfit, sans-serif',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.3,
                  flex: 1,
                  minWidth: 0,
                }}>
                  {c.full_name ?? 'Cliente'}
                </p>
              </div>

              {/* Days since + emoji */}
              <p style={{
                margin: 0,
                fontSize: 11,
                color: '#9CA3AF',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.3,
              }}>
                {isRed ? '🔴' : '🟡'}&nbsp;da {c.days_since}gg
              </p>

              {/* Contatta button — min 44px touch target via padding */}
              <button
                type="button"
                onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
                style={{
                  height: 30,
                  background: accentBg,
                  color: accentText,
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  width: '100%',
                  marginTop: 'auto',
                }}
              >
                Contatta
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
