'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Gift } from 'lucide-react'
import type { PendingReward } from '@/lib/actions/dashboard-home'

interface Props {
  rewards: PendingReward[]
  basePath: string
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

export function PendingRewardsWidget({ rewards, basePath }: Props) {
  const router = useRouter()
  if (rewards.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rewards.map((r) => (
        <div
          key={r.client_id}
          role="button"
          tabIndex={0}
          onClick={() => router.push(`${basePath}/clienti/${r.client_id}`)}
          onKeyDown={(e) => { if (e.key === 'Enter') router.push(`${basePath}/clienti/${r.client_id}`) }}
          aria-label={`${r.full_name ?? 'Cliente'} può riscattare: ${r.reward_name}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: '#FAFAFA',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.05)',
            cursor: 'pointer',
            outline: 'none',
            WebkitTapHighlightColor: 'rgba(0,0,0,0)',
            transition: 'background 0.12s',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#F5F5F5' }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA' }}
        >
          {/* Avatar with initials */}
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'rgba(34,197,94,0.10)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 800,
            color: '#16A34A',
            fontFamily: 'Outfit, sans-serif',
          }}>
            {r.full_name ? getInitials(r.full_name) : <Gift size={14} color="#16A34A" />}
          </div>

          {/* Name + reward */}
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
              {r.full_name ?? 'Cliente'}
            </p>
            <p style={{
              margin: 0,
              fontSize: 10,
              color: '#9CA3AF',
              fontFamily: 'Outfit, sans-serif',
              lineHeight: 1.3,
              marginTop: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {r.reward_name}
            </p>
          </div>

          {/* Points pill */}
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '3px 7px',
            borderRadius: 99,
            background: '#D1FAE5',
            color: '#059669',
            fontFamily: 'Outfit, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}>
            {r.points_available} pt
          </span>

          {/* Gift icon */}
          <Gift size={14} color="#9CA3AF" strokeWidth={2} style={{ flexShrink: 0 }} />
        </div>
      ))}
    </div>
  )
}
