'use client'

import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { TopLoyaltyClient } from '@/lib/actions/dashboard-home'

const TIER_STYLES: Record<string, { gradient: string; icon: string }> = {
  bronze:  { gradient: 'linear-gradient(135deg,#cd7f32,#a0522d)', icon: '🥉' },
  silver:  { gradient: 'linear-gradient(135deg,#e8e6df,#bdbab0)', icon: '🥈' },
  gold:    { gradient: 'linear-gradient(135deg,#ffd700,#c8a04a)', icon: '🥇' },
  diamond: { gradient: 'linear-gradient(135deg,#a8d8ea,#aa96da,#fcbad3)', icon: '💎' },
}

interface Props {
  clients: TopLoyaltyClient[]
  basePath: string
}

export function TopLoyaltyClientsWidget({ clients, basePath }: Props) {
  if (clients.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        borderRadius: 20,
        padding: '20px 24px',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={15} color="var(--color-fg)" />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-fg)', letterSpacing: '1.2px', textTransform: 'uppercase' }}>
            Top Clienti Fedeltà
          </span>
        </div>
        <Link
          href={`${basePath}/clienti`}
          style={{ fontSize: 12, color: 'var(--color-fg-secondary)', textDecoration: 'none' }}
        >
          Vedi tutti →
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clients.slice(0, 10).map((client, idx) => {
          const tier = TIER_STYLES[client.currentTier] ?? TIER_STYLES.bronze
          return (
            <Link
              key={client.clientId}
              href={`${basePath}/clienti/${client.clientId}`}
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 14, background: 'var(--color-bg-secondary)', transition: 'opacity 0.15s' }}
            >
              {/* Rank */}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-fg-muted)', width: 20, flexShrink: 0 }}>
                {idx + 1}
              </span>

              {/* Tier badge */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: tier.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {tier.icon}
              </div>

              {/* Name + streak */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {client.fullName}
                </p>
                {client.currentStreak > 1 && (
                  <p style={{ fontSize: 11, color: '#f97316', margin: 0 }}>
                    🔥 {client.currentStreak} di fila
                  </p>
                )}
              </div>

              {/* Points */}
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--color-fg)', flexShrink: 0 }}>
                {client.totalPoints.toLocaleString('it-IT')} pt
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
