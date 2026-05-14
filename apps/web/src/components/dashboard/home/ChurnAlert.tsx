'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { TrendingDown } from 'lucide-react'
import type { AtRiskClient } from '@/lib/actions/dashboard-home'

interface Props {
  clients: AtRiskClient[]
  basePath: string
}

const MAX_SHOWN = 5

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function ChurnAlert({ clients, basePath }: Props) {
  const router = useRouter()
  if (clients.length === 0) return null

  const shown = clients.slice(0, MAX_SHOWN)
  const hasMore = clients.length > MAX_SHOWN

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

      {/* Vertical list */}
      <div className="churn-mobile-list" style={{ flex: 1 }}>
        {shown.map((c) => {
          const isRed = c.churn_status === 'red'
          const accentColor = isRed ? '#EF4444' : '#F59E0B'
          const avatarBg    = isRed ? '#fee2e2' : '#fef3c7'
          const avatarColor = isRed ? '#dc2626' : '#d97706'
          return (
            <div
              key={c.client_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                background: '#FAFAFA',
                borderRadius: 10,
                borderLeft: `3px solid ${accentColor}`,
              }}
            >
              {/* Initials avatar */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: avatarBg,
                  color: avatarColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'Outfit, sans-serif',
                  flexShrink: 0,
                  letterSpacing: '0.3px',
                }}
              >
                {getInitials(c.full_name)}
              </div>

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
          )
        })}
      </div>

      {/* "View all" button → Marketing / Retention tab */}
      {hasMore && (
        <button
          type="button"
          onClick={() => router.push(`${basePath}/marketing?tab=retention`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            width: '100%',
            padding: '9px 0',
            borderRadius: 10,
            border: '1px solid #fee2e2',
            background: '#fff5f5',
            color: '#dc2626',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Outfit, sans-serif',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <TrendingDown size={13} />
          Vedi tutti i {clients.length} clienti a rischio
        </button>
      )}
    </div>
  )
}
