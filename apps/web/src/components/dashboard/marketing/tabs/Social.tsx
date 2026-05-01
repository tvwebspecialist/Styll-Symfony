'use client'

import * as React from 'react'
import { Smartphone, Calendar, Wand2 } from 'lucide-react'

interface SocialProps {
  tenantId: string
}

const FEATURES: {
  Icon: React.ComponentType<{ size?: number; color?: string }>
  title: string
  sub:   string
}[] = [
  { Icon: Smartphone, title: 'Post-visita automatico',  sub: 'Story brandizzata dopo ogni appuntamento'     },
  { Icon: Calendar,   title: 'Slot disponibili oggi',   sub: "Riempi l'agenda con una Story in 1 tap"       },
  { Icon: Wand2,      title: 'Crea contenuto',          sub: 'Template AI adattati al tuo brand'            },
]

export function Social({ tenantId: _tenantId }: SocialProps) {
  return (
    <div style={{ padding: '48px 16px', textAlign: 'center' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Badge */}
        <span
          style={{
            background:   '#F5F5F5',
            borderRadius: 100,
            padding:      '6px 16px',
            fontSize:     12,
            fontWeight:   600,
            color:        '#888888',
            display:      'inline-block',
            marginBottom: 24,
          }}
        >
          🚀 Prossimamente
        </span>

        {/* Titolo */}
        <h2
          style={{
            fontSize:     28,
            fontWeight:   700,
            color:        '#222222',
            lineHeight:   1.2,
            margin:       '0 0 12px',
          }}
        >
          Social &amp; Contenuti AI
        </h2>

        {/* Sottotitolo */}
        <p
          style={{
            fontSize:     16,
            color:        '#B0B0B0',
            marginBottom: 32,
            lineHeight:   1.5,
            margin:       '0 0 32px',
          }}
        >
          Dopo ogni taglio, la tua storia è già pronta. Pubblica in 1 tap.
        </p>

        {/* Feature cards */}
        <div
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           12,
            textAlign:     'left',
            marginBottom:  32,
          }}
        >
          {FEATURES.map(({ Icon, title, sub }, i) => (
            <div
              key={i}
              style={{
                background:   '#FFFFFF',
                border:       '1px solid #F0F0F0',
                borderRadius: 12,
                padding:      '14px 16px',
                display:      'flex',
                alignItems:   'center',
                gap:          12,
              }}
            >
              <div
                style={{
                  width:          36,
                  height:         36,
                  borderRadius:   100,
                  background:     '#F5F5F5',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  flexShrink:     0,
                }}
              >
                <Icon size={16} color="#888888" />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222222' }}>
                  {title}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B0B0B0' }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Instagram banner */}
        <div
          style={{
            background:   'linear-gradient(135deg, #833AB4 0%, #E1306C 60%, #F77737 100%)',
            borderRadius: 16,
            padding:      20,
            textAlign:    'left',
          }}
        >
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
            Collega Instagram Business
          </p>
          <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#FFFFFF', opacity: 0.8 }}>
            Registra il tuo interesse e sarai tra i primi ad accedervi.
          </p>
          <button
            style={{
              background:   '#FFFFFF',
              color:        '#833AB4',
              borderRadius: 100,
              padding:      '9px 20px',
              fontSize:     13,
              fontWeight:   700,
              border:       'none',
              cursor:       'pointer',
            }}
          >
            Sono interessato
          </button>
        </div>

      </div>
    </div>
  )
}
