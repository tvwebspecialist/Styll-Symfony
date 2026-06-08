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

const RANK_COLOR = ['#F59E0B', '#6B7280', '#D97706']
const RANK_BG    = ['#fef3c7', '#F3F4F6', '#ffedd5']

interface Props {
  weekAppointments: TodayAppointment[]
  basePath: string
}

export function TopClientsWidget({ weekAppointments, basePath }: Props) {
  const router = useRouter()
  const top = buildTopClients(weekAppointments)

  if (top.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{
        margin: 0,
        fontSize: 13,
        fontWeight: 700,
        color: '#111111',
        fontFamily: 'Outfit, sans-serif',
        letterSpacing: '-0.2px',
      }}>
        🏆 Clienti top questa settimana
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {top.map((c, i) => (
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
              padding: '8px 10px',
              background: '#FAFAFA',
              borderRadius: 10,
              cursor: 'pointer',
              outline: 'none',
              WebkitTapHighlightColor: 'rgba(0,0,0,0)',
            }}
          >
            {/* Rank badge */}
            <div style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: RANK_BG[i] ?? '#F3F4F6',
              color: RANK_COLOR[i] ?? '#6B7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 800,
              flexShrink: 0,
              fontFamily: 'Outfit, sans-serif',
            }}>
              {i + 1}
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
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#111111', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                {c.visits} {c.visits === 1 ? 'visita' : 'visite'}
              </p>
              <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>
                €{c.revenue}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
