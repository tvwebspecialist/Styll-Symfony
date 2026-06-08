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
    <div
      aria-label={`Clienti a rischio churn: ${clients.length}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--card-radius, 16px)',
        background: 'var(--sidebar-item-active-bg, #222222)',
        padding: '20px',
      }}
    >
      {/* Watermark icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/img/allert_churn.png"
        alt=""
        aria-hidden="true"
        className="churn-watermark-icon"
        style={{
          position: 'absolute',
          bottom: -24,
          right: -20,
          width: 150,
          height: 150,
          objectFit: 'contain',
          opacity: 0.22,
          pointerEvents: 'none',
          transform: 'rotate(-10deg)',
          filter: 'drop-shadow(0 4px 12px rgba(239,68,68,0.3))',
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
      />

      {/* Header */}
      <div style={{ marginBottom: 16, paddingRight: 80 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#EF4444',
          marginBottom: 4,
          fontFamily: 'Outfit, sans-serif',
        }}>
          ⚠ Attenzione
        </div>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: '#FFFFFF',
          fontFamily: 'Outfit, sans-serif',
          letterSpacing: '-0.2px',
        }}>
          Clienti che stai perdendo
        </div>
      </div>

      {/* Vertical card grid */}
      <div className="churn-cards-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: 12,
      }}>
        {clients.map((c) => {
          const isRed = c.churn_status === 'red' || c.days_since > 60

          return (
            <div
              key={c.client_id}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                textAlign: 'center',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.2)',
                border: '2px solid rgba(239,68,68,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#FCA5A5',
                boxShadow: '0 0 12px rgba(239,68,68,0.3)',
                flexShrink: 0,
                fontFamily: 'Outfit, sans-serif',
              }}>
                {getInitials(c.full_name)}
              </div>

              {/* Name */}
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#F9FAFB',
                lineHeight: 1.2,
                wordBreak: 'break-word',
                fontFamily: 'Outfit, sans-serif',
              }}>
                {c.full_name ?? 'Cliente'}
              </div>

              {/* Days since visit */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                color: '#FCA5A5',
                fontWeight: 600,
                fontFamily: 'Outfit, sans-serif',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: isRed ? '#EF4444' : '#F59E0B',
                  boxShadow: isRed
                    ? '0 0 6px rgba(239,68,68,0.8)'
                    : '0 0 6px rgba(245,158,11,0.8)',
                }} />
                {c.days_since}gg senza visita
              </div>

              {/* Average frequency */}
              {c.avg_frequency != null && (
                <div style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.35)',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  Ogni {c.avg_frequency}gg di media
                </div>
              )}

              {/* Win-back CTA */}
              <button
                type="button"
                aria-label={`Contatta ${c.full_name ?? 'cliente'}`}
                onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
                style={{
                  marginTop: 4,
                  width: '100%',
                  padding: '8px 0',
                  borderRadius: 99,
                  fontSize: 12,
                  fontWeight: 700,
                  background: '#EF4444',
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
    </div>
  )
}
