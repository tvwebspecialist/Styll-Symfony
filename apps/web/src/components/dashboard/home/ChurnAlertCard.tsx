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
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function ChurnAlertCard({ clients, basePath }: Props) {
  const router = useRouter()
  if (clients.length === 0) return null

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
      gap: 10,
    }}>
      {clients.map((c) => {
        const isRed = c.churn_status === 'red' || c.days_since > 60
        const dotColor = isRed ? '#EF4444' : '#F59E0B'

        return (
          <div
            key={c.client_id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
            onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/clienti/${c.client_id}`) }}
            aria-label={`Cliente a rischio: ${c.full_name ?? 'Cliente'}`}
            style={{
              background: '#FAFAFA',
              border: `1px solid ${isRed ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)'}`,
              borderRadius: 14,
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 7,
              textAlign: 'center',
              cursor: 'pointer',
              outline: 'none',
              transition: 'box-shadow 0.15s, transform 0.15s',
              WebkitTapHighlightColor: 'rgba(0,0,0,0)',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: isRed ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
              border: `1.5px solid ${isRed ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.30)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: isRed ? '#DC2626' : '#D97706',
              flexShrink: 0,
              fontFamily: 'Outfit, sans-serif',
            }}>
              {getInitials(c.full_name)}
            </div>

            {/* Name */}
            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#111111',
              lineHeight: 1.2,
              wordBreak: 'break-word',
              fontFamily: 'Outfit, sans-serif',
            }}>
              {c.full_name ?? 'Cliente'}
            </div>

            {/* Days badge */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: isRed ? '#DC2626' : '#D97706',
              fontWeight: 600,
              fontFamily: 'Outfit, sans-serif',
            }}>
              <span style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: dotColor,
                boxShadow: `0 0 5px ${dotColor}`,
              }} />
              {c.days_since}gg senza visita
            </div>

            {/* Avg frequency */}
            {c.avg_frequency != null && (
              <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif' }}>
                Ogni {c.avg_frequency}gg di media
              </div>
            )}

            {/* CTA */}
            <button
              type="button"
              aria-label={`Contatta ${c.full_name ?? 'cliente'}`}
              onClick={(e) => { e.stopPropagation(); router.push(`${basePath}/clienti/${c.client_id}`) }}
              style={{
                marginTop: 2,
                width: '100%',
                padding: '7px 0',
                borderRadius: 99,
                fontSize: 11,
                fontWeight: 700,
                background: isRed ? '#EF4444' : '#F59E0B',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                fontFamily: 'Outfit, sans-serif',
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
