'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { AtRiskClient } from '@/lib/actions/dashboard-home'

interface Props {
  clients: AtRiskClient[]
  basePath: string
}

export function ChurnAlert({ clients, basePath }: Props) {
  const router = useRouter()

  if (clients.length === 0) return null

  const shown = clients.slice(0, 3)
  const remaining = clients.length - shown.length

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 20,
        border: '1px solid #E9E9E9',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#222222', margin: 0, fontFamily: 'Outfit, sans-serif' }}>
          Clienti a rischio
        </p>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            background: '#fee2e2',
            color: '#dc2626',
            borderRadius: 99,
            padding: '3px 10px',
          }}
        >
          {clients.length}
        </span>
      </div>

      {/* Client rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((c) => (
          <div
            key={c.client_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: c.churn_status === 'red' ? '#E24B4A' : '#EF9F27',
                flexShrink: 0,
              }}
            />
            {/* Name + stats */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#222222', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.full_name ?? 'Cliente'}
              </p>
              <p style={{ fontSize: 12, color: '#B0B0B0', margin: 0 }}>
                {c.days_since} giorni{c.avg_frequency ? ` · media ${Math.round(c.avg_frequency)} gg` : ''}
              </p>
            </div>
            {/* Contact button */}
            <button
              type="button"
              onClick={() => router.push(`${basePath}/clienti/${c.client_id}`)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 12px',
                border: '1px solid #E9E9E9',
                borderRadius: 8,
                background: 'transparent',
                color: '#222222',
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'Outfit, sans-serif',
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
            fontSize: 13,
            color: '#B0B0B0',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            textAlign: 'left',
          }}
        >
          Vedi tutti i {clients.length} clienti →
        </button>
      )}
    </div>
  )
}
