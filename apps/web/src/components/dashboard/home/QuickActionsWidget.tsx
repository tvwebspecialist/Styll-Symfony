'use client'

import * as React from 'react'
import Link from 'next/link'
import { Calendar, UserPlus, BarChart2, MessageSquare } from 'lucide-react'

interface Props {
  basePath: string
}

const ACTIONS = [
  { Icon: Calendar,      label: 'Nuovo appuntamento', path: '/calendario?new=1' },
  { Icon: UserPlus,      label: 'Aggiungi cliente',    path: '/clienti/nuovo' },
  { Icon: BarChart2,     label: 'Analytics vendite',   path: '/vendite' },
  { Icon: MessageSquare, label: 'Messaggi win-back',   path: '/marketing' },
]

export function QuickActionsWidget({ basePath }: Props) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E9E9E9',
        borderRadius: 20,
        padding: 12,
      }}
    >
      <p
        style={{
          margin: '0 0 4px 4px',
          fontSize: 13,
          fontWeight: 700,
          color: '#222222',
          fontFamily: 'Outfit, sans-serif',
        }}
      >
        Azioni rapide
      </p>
      <div>
        {ACTIONS.map(({ Icon, label, path }) => (
          <Link
            key={label}
            href={`${basePath}${path}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              textDecoration: 'none',
              color: '#222222',
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.background = '#F5F5F5'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.background = 'transparent'
            }}
          >
            <Icon size={16} strokeWidth={2} style={{ color: '#888888', flexShrink: 0 }} />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
