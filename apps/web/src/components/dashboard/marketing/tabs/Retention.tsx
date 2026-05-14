'use client'

import * as React from 'react'
import { CheckCircle } from 'lucide-react'
import { Card } from '@/components/dashboard/vendite/ui'
import { getRetentionData, type RetentionData, type RetentionClient } from '@/lib/actions/marketing'

interface RetentionProps {
  tenantId: string
}

type Segment = 'rischio' | 'winback' | 'persi'

/** Single source of truth for segment metadata */
const SEG_META: {
  key:        Segment
  label:      string
  iconBg:     string
  iconColor:  string
}[] = [
  { key: 'rischio', label: 'A rischio',     iconBg: '#FEF9C3', iconColor: '#854D0E' },
  { key: 'winback', label: 'Da recuperare', iconBg: '#FFF7ED', iconColor: '#9A3412' },
  { key: 'persi',   label: 'Persi',         iconBg: '#FEF2F2', iconColor: '#991B1B' },
]

const EMPTY_MESSAGES: Record<Segment, string> = {
  rischio: 'Nessun cliente a rischio al momento.',
  winback: 'Nessun cliente da recuperare.',
  persi:   'Nessun cliente perso. Ottimo lavoro!',
}

const ACTION_LABELS: Record<Segment, string> = {
  rischio: 'Messaggio',
  winback: 'Offerta',
  persi:   'Recupero',
}

/** Colore hover leggermente più scuro per il bottone azione */
const BTN_HOVER_BG: Record<Segment, string> = {
  rischio: '#FEF08A',
  winback: '#FED7AA',
  persi:   '#FECACA',
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

const SEG_CONFIG = {
  rischio: {
    img:             '/img/Churn_yellow.png',
    activeGradient:  'linear-gradient(135deg, #FEFCE8 0%, #FEF9C3 100%)',
    activeBorder:    '#FDE68A',
    accentColor:     '#854D0E',
  },
  winback: {
    img:             '/img/Churn_red.png',
    activeGradient:  'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
    activeBorder:    '#FCA5A5',
    accentColor:     '#991B1B',
  },
  persi: {
    img:             '/img/Churn_black.png',
    activeGradient:  'linear-gradient(135deg, #F5F5F5 0%, #E5E5E5 100%)',
    activeBorder:    '#A3A3A3',
    accentColor:     '#404040',
  },
} as const

function KpiCardItem({
  label, count, segment, isActive, onClick,
}: {
  label:    string
  count:    number
  segment:  Segment
  isActive: boolean
  onClick:  () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const cfg    = SEG_CONFIG[segment]
  const lifted = hovered || isActive

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:   'relative',
        flex:       1,
        minWidth:   240,
        height:     140,
        padding:    '20px 24px',
        borderRadius: 20,
        border:     `1px solid ${isActive ? cfg.activeBorder : '#F0F0F0'}`,
        background: isActive ? cfg.activeGradient : '#FFFFFF',
        cursor:     'pointer',
        textAlign:  'left',
        overflow:   'hidden',
        transition: 'all 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        boxShadow:  isActive
          ? '0 8px 24px rgba(0,0,0,0.06)'
          : hovered
            ? '0 4px 12px rgba(0,0,0,0.05)'
            : '0 1px 3px rgba(10,13,18,0.04)',
      }}
    >
      {/* Testo sinistra */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: '60%' }}>
        <p style={{
          margin:        0,
          fontSize:      11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color:         isActive ? cfg.accentColor : '#B0B0B0',
          fontWeight:    600,
          marginBottom:  12,
        }}>
          {label}
        </p>
        <p style={{
          margin:        0,
          fontSize:      40,
          fontWeight:    700,
          color:         isActive ? cfg.accentColor : '#222222',
          lineHeight:    1,
          letterSpacing: '-0.02em',
        }}>
          {count}
        </p>
      </div>

      {/* Sfera 3D destra */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cfg.img}
        alt=""
        aria-hidden
        style={{
          position:      'absolute',
          right:         lifted ? -8 : -24,
          top:           '50%',
          width:         140,
          height:        140,
          transform:     lifted
            ? 'translateY(-50%) scale(0.95) rotate(-6deg)'
            : 'translateY(-50%) scale(1.05) rotate(0deg)',
          opacity:       lifted ? 1 : 0.85,
          transition:    'all 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter:        lifted ? 'drop-shadow(0 8px 20px rgba(0,0,0,0.15))' : 'none',
          pointerEvents: 'none',
          zIndex:        1,
          objectFit:     'contain',
        }}
      />
    </button>
  )
}

function KpiCardSkeleton() {
  return (
    <Card style={{ flex: '1 1 240px', minWidth: 240, height: 140, padding: 20 }}>
      <div style={{ background: '#F4F4F4', height: 12, width: '40%', borderRadius: 4 }} />
      <div style={{ background: '#F4F4F4', height: 36, width: '30%', borderRadius: 6, marginTop: 16 }} />
    </Card>
  )
}

function ClientRow({ client, segment }: { client: RetentionClient; segment: Segment }) {
  const meta     = SEG_META.find((m) => m.key === segment)!
  const [hov, setHov] = React.useState(false)

  return (
    <div
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #F0F0F0',
        borderRadius: 12,
        padding:      '16px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width:          40,
          height:         40,
          borderRadius:   100,
          background:     meta.iconBg,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       13,
          fontWeight:     700,
          color:          meta.iconColor,
          flexShrink:     0,
        }}
      >
        {initials(client.name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin:       0,
            fontSize:     15,
            fontWeight:   600,
            color:        '#222222',
            whiteSpace:   'nowrap',
            overflow:     'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {client.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize:     11,
              fontWeight:   600,
              borderRadius: 100,
              padding:      '2px 8px',
              background:   meta.iconBg,
              color:        meta.iconColor,
              flexShrink:   0,
            }}
          >
            {client.daysSinceVisit} giorni
          </span>
          <span
            style={{
              fontSize:     12,
              color:        '#B0B0B0',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            · ultimo: {client.lastService ?? 'N/D'}
          </span>
        </div>
      </div>

      {/* Action button */}
      <button
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          fontSize:     12,
          fontWeight:   600,
          borderRadius: 8,
          padding:      '7px 14px',
          border:       'none',
          cursor:       'pointer',
          background:   hov ? BTN_HOVER_BG[segment] : meta.iconBg,
          color:        meta.iconColor,
          flexShrink:   0,
          transition:   'background 150ms ease',
        }}
      >
        {ACTION_LABELS[segment]}
      </button>
    </div>
  )
}


export function Retention({ tenantId }: RetentionProps) {
  const [data,    setData]    = React.useState<RetentionData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [active,  setActive]  = React.useState<Segment>('rischio')

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getRetentionData(tenantId)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tenantId])

  // Auto-select first non-empty segment after data loads
  React.useEffect(() => {
    if (!data) return
    if (data[active].length === 0) {
      const firstNonEmpty = (['rischio', 'winback', 'persi'] as Segment[])
        .find((s) => data[s].length > 0)
      if (firstNonEmpty) setActive(firstNonEmpty)
    }
  }, [data]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
        <Card>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background:   '#F9F9F9',
                borderRadius: 12,
                height:       64,
                marginBottom: i < 2 ? 8 : 0,
              }}
            />
          ))}
        </Card>
      </div>
    )
  }

  const counts = {
    rischio: data?.rischio.length ?? 0,
    winback: data?.winback.length ?? 0,
    persi:   data?.persi.length   ?? 0,
  }

  const clients: RetentionClient[] = data?.[active] ?? []

  const otherSegmentsWithClients = (['rischio', 'winback', 'persi'] as Segment[])
    .filter((s) => s !== active && counts[s] > 0)
  const totalOthers = otherSegmentsWithClients.reduce((sum, s) => sum + counts[s], 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI / filtri (cliccabili) ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {SEG_META.map(({ key, label }) => (
          <KpiCardItem
            key={key}
            label={label}
            count={counts[key]}
            segment={key}
            isActive={active === key}
            onClick={() => setActive(key)}
          />
        ))}
      </div>

      {/* ── Lista clienti ── */}
      {clients.length === 0 ? (
        totalOthers > 0 ? (
          <Card style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#222222' }}>
              Nessun cliente in questo segmento
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#B0B0B0' }}>
              Hai però {totalOthers} {totalOthers === 1 ? 'cliente' : 'clienti'} in altri segmenti — clicca le card sopra per vederli.
            </p>
          </Card>
        ) : (
          <Card style={{ padding: 48, textAlign: 'center' }}>
            <CheckCircle size={32} color="#16A34A" />
            <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 700, color: '#222222' }}>
              Tutto bene!
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#B0B0B0' }}>
              {EMPTY_MESSAGES[active]}
            </p>
          </Card>
        )
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} segment={active} />
          ))}
        </div>
      )}

    </div>
  )
}
