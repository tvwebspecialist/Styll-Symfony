'use client'

import * as React from 'react'
import Link from 'next/link'
import { CalendarPlus, UserPlus, BarChart2 } from 'lucide-react'

interface Props {
  basePath: string
}

const ACTIONS = [
  { Icon: CalendarPlus, label: 'Nuovo appuntamento', path: '/calendario?new=1', primary: true },
  { Icon: UserPlus,     label: 'Nuovo cliente',       path: '/clienti/nuovo',   primary: false },
  { Icon: BarChart2,    label: 'Vedi analytics',       path: '/vendite',         primary: false },
]

export function QuickActionsWidget({ basePath }: Props) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {ACTIONS.map(({ Icon, label, path, primary }) => (
        <Link
          key={label}
          href={`${basePath}${path}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '0 14px',
            height: 36,
            borderRadius: 99,
            textDecoration: 'none',
            fontSize: 12,
            fontWeight: 600,
            fontFamily: 'Outfit, sans-serif',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            background: primary ? '#111827' : '#F3F4F6',
            color: primary ? '#FFFFFF' : '#374151',
            border: 'none',
          }}
        >
          <Icon size={13} strokeWidth={2} />
          {label}
        </Link>
      ))}
    </div>
  )
}
