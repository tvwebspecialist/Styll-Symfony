'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { AtRiskClient } from '@/lib/actions/dashboard-home'

interface Props {
  clients: AtRiskClient[]
  basePath: string
}

function RiskDot({ level }: { level: string }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: level === 'red' ? '#EF4444' : '#F59E0B',
        flexShrink: 0,
      }}
    />
  )
}

export function ChurnAlert({ clients, basePath }: Props) {
  const router = useRouter()
  if (clients.length === 0) return null

  const shown = clients.slice(0, 5)
  const remaining = clients.length - shown.length

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111111', margin: 0, fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.2px' }}>
          Clienti a rischio
        </p>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: 99,
            padding: '3px 9px',
          }}
        >
          {clients.length}
        </span>
      </div>

      {/* List — horizontal scroll on mobile via CSS class, vertical on desktop */}
      <div className="churn-mobile-list" style={{ flex: 1 }}>
        {shown.map((c) => (
          <div
            key={c.client_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              /* Mobile card: fixed width in horizontal scroll */
              minWidth: 180,
              flexShrink: 0,
              padding: '8px 12px',
              background: '#FAFAFA',
              borderRadius: 10,
              borderLeft: `3px solid ${c.churn_status === 'red' ? '#EF4444' : '#F59E0B'}`,
            }}
          >
            {/* Risk dot — desktop only */}
            <RiskDot level={c.churn_status} />

            {/* Name + days */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111111', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>
                {c.full_name ?? 'Cliente'}
              </p>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {c.days_since}gg{c.avg_frequency ? ` · media ${Math.round(c.avg_frequency)}gg` : ''}
              </p>
            </div>

            {/* Contact button */}
            <button
              type="button"
              onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: '0 10px',
                height: 30,
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 8,
                background: 'transparent',
                color: '#374151',
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'Outfit, sans-serif',
                whiteSpace: 'nowrap',
              }}
            >
              Contatta
            </button>
          </div>
        ))}
      </div>

      {/* More link */}
      {remaining > 0 && (
        <button
          type="button"
          onClick={() => router.push(`${basePath}/clienti?filter=at_risk`)}
          style={{
            fontSize: 12,
            color: '#9CA3AF',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
            fontFamily: 'Outfit, sans-serif',
            flexShrink: 0,
          }}
        >
          + {remaining} altri →
        </button>
      )}
    </div>
  )
}
