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

const MAX_SHOWN = 5

export function ChurnAlertCard({ clients, basePath }: Props) {
  const router = useRouter()
  const shown = clients.slice(0, MAX_SHOWN)

  if (clients.length === 0) return null

  return (
    <div
      aria-label={`Clienti a rischio churn: ${clients.length}`}
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        borderLeft: '3px solid #DC2626',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        boxSizing: 'border-box',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 3D decoration icon */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/allert_churn.png"
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: -10,
          right: -10,
          width: 110,
          opacity: 0.9,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#111111',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.2px',
          }}
        >
          ⚠️ Clienti che stai perdendo
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: 99,
            padding: '3px 8px',
          }}
        >
          {clients.length}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((c) => {
          const isRed = c.churn_status === 'red' || c.days_since > 35
          const accentColor = isRed ? '#EF4444' : '#F59E0B'
          const avatarBg = isRed ? '#fee2e2' : '#fef3c7'
          const avatarColor = isRed ? '#dc2626' : '#d97706'

          return (
            <div
              key={c.client_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: '#FAFAFA',
                borderRadius: 10,
                borderLeft: `3px solid ${accentColor}`,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: avatarBg,
                  color: avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'Outfit, sans-serif',
                  flexShrink: 0,
                }}
              >
                {getInitials(c.full_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#111111',
                    fontFamily: 'Outfit, sans-serif',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                  }}
                >
                  {c.full_name ?? 'Cliente'}
                </p>
                <p
                  style={{
                    margin: '2px 0 0',
                    fontSize: 10,
                    color: '#9CA3AF',
                    fontFamily: 'Outfit, sans-serif',
                    lineHeight: 1,
                  }}
                >
                  {isRed ? '🔴' : '🟡'} {c.days_since}gg senza visita
                </p>
                {c.avg_frequency != null && (
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 10,
                      color: '#B0B8C1',
                      fontFamily: 'Outfit, sans-serif',
                      lineHeight: 1,
                    }}
                  >
                    Viene ogni {c.avg_frequency}gg di media
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`Win-back ${c.full_name ?? 'cliente'}`}
                onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '0 8px',
                  height: 26,
                  border: '1px solid rgba(0,0,0,0.1)',
                  borderRadius: 6,
                  background: 'transparent',
                  color: '#374151',
                  cursor: 'pointer',
                  flexShrink: 0,
                  fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap',
                }}
              >
                Win-back
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
