'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { TodayAppointment } from '@/lib/actions/dashboard-home'

interface ClientStat {
  client_id: string
  client_name: string
  visits: number
  revenue: number
}

function buildTopClients(appointments: TodayAppointment[]): ClientStat[] {
  const map = new Map<string, ClientStat>()
  for (const a of appointments) {
    if (a.status === 'cancelled' || a.status === 'no_show') continue
    const existing = map.get(a.client_id)
    if (existing) {
      existing.visits++
      existing.revenue += a.total_price
    } else {
      map.set(a.client_id, {
        client_id: a.client_id,
        client_name: a.client_name,
        visits: 1,
        revenue: a.total_price,
      })
    }
  }
  return [...map.values()]
    .sort((a, b) => b.visits - a.visits || b.revenue - a.revenue)
    .slice(0, 3)
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase()
}

const RANK_COLORS = [
  { bg: 'rgba(245,158,11,0.12)', color: '#D97706' },
  { bg: 'rgba(107,114,128,0.10)', color: '#6B7280' },
  { bg: 'rgba(180,83,9,0.10)', color: '#B45309' },
]

interface Props {
  weekAppointments: TodayAppointment[]
  basePath: string
}

export function TopClientsWidget({ weekAppointments, basePath }: Props) {
  const router = useRouter()
  const top = buildTopClients(weekAppointments)

  if (top.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <p style={{
        margin: 0,
        fontSize: 11,
        fontWeight: 700,
        color: '#9CA3AF',
        fontFamily: 'Outfit, sans-serif',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
      }}>
        Clienti top settimana
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {top.map((c, i) => {
          const rc = RANK_COLORS[i] ?? RANK_COLORS[2]!
          return (
            <div
              key={c.client_id}
              role="button"
              tabIndex={0}
              onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
              onKeyDown={(e) => e.key === 'Enter' && router.push(`${basePath}/clienti/${c.client_id}`)}
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
              {/* Avatar with rank number */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: rc.bg,
                color: rc.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
                fontFamily: 'Outfit, sans-serif',
                position: 'relative',
              }}>
                {getInitials(c.client_name)}
                <span style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: rc.color,
                  color: '#FFFFFF',
                  fontSize: 8,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Outfit, sans-serif',
                  border: '1.5px solid #FFFFFF',
                }}>
                  {i + 1}
                </span>
              </div>

              {/* Name */}
              <p style={{
                flex: 1,
                margin: 0,
                fontSize: 13,
                fontWeight: 600,
                color: '#111111',
                fontFamily: 'Outfit, sans-serif',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {c.client_name}
              </p>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, gap: 2 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#111111', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                  {c.visits} {c.visits === 1 ? 'visita' : 'visite'}
                </p>
                {c.revenue > 0 && (
                  <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                    €{c.revenue}
                  </p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
