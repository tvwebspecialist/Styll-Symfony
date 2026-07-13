'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserX } from 'lucide-react'
import type { AtRiskClient } from '@/lib/actions/dashboard-home'

interface Props {
  clients: AtRiskClient[]
  basePath: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function ChurnAlertCard({ clients, basePath }: Props) {
  const router = useRouter()
  if (clients.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {clients.map((c) => {
        const isRed = c.churn_status === 'red' || c.days_since > 60
        const iconBg = isRed ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)'
        const iconColor = isRed ? '#DC2626' : '#D97706'
        const pillBg = isRed ? '#FEE2E2' : '#FEF3C7'
        const pillColor = isRed ? '#DC2626' : '#D97706'

        return (
          <div
            key={c.client_id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/clienti/${c.client_id}`) }}
            aria-label={`Cliente a rischio: ${c.full_name ?? 'Cliente'}`}
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
            {/* Avatar / icon box */}
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              background: c.avatar_url ? 'transparent' : iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 800,
              color: iconColor,
              fontFamily: 'Outfit, sans-serif',
              overflow: 'hidden',
            }}>
              {c.avatar_url
                ? <img src={c.avatar_url} alt={c.full_name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : c.full_name ? getInitials(c.full_name) : <UserX size={14} color={iconColor} />
              }
            </div>

            {/* Name + freq */}
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
                {c.full_name ?? 'Cliente'}
              </p>
              {c.avg_frequency != null && (
                <p style={{
                  margin: 0,
                  fontSize: 10,
                  color: '#9CA3AF',
                  fontFamily: 'Outfit, sans-serif',
                  lineHeight: 1.3,
                  marginTop: 1,
                }}>
                  Ogni {c.avg_frequency}gg
                </p>
              )}
            </div>

            {/* Days pill */}
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
              {c.days_since}gg fa
            </span>

            {/* Contatta button */}
            <button
              type="button"
              aria-label={`Contatta ${c.full_name ?? 'cliente'}`}
              onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/clienti/${c.client_id}`) }}
              style={{
                padding: '5px 10px',
                borderRadius: 99,
                fontSize: 10,
                fontWeight: 700,
                background: isRed ? '#EF4444' : '#F59E0B',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                fontFamily: 'Outfit, sans-serif',
                flexShrink: 0,
                lineHeight: 1.4,
              }}
            >
              Contatta
            </button>
          </div>
        )
      })}
    </div>
  )
}
