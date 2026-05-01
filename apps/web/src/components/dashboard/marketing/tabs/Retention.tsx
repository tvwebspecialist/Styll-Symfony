'use client'

import * as React from 'react'
import { UserMinus, RefreshCw, UserX, CheckCircle } from 'lucide-react'
import { Card } from '@/components/dashboard/vendite/ui'
import { getRetentionData, type RetentionData, type RetentionClient } from '@/lib/actions/marketing'

interface RetentionProps {
  tenantId: string
}

type Segment = 'rischio' | 'winback' | 'persi'

const SUB_TABS: { key: Segment; label: string; activeColor: string; activeBg: string }[] = [
  { key: 'rischio', label: 'A rischio', activeColor: '#854D0E', activeBg: '#FEF9C3' },
  { key: 'winback', label: 'Win-back',  activeColor: '#9A3412', activeBg: '#FFF7ED' },
  { key: 'persi',   label: 'Persi',     activeColor: '#991B1B', activeBg: '#FEF2F2' },
]

const KPI_META = [
  { label: 'A rischio',     seg: 'rischio' as Segment, Icon: UserMinus,  iconBg: '#FEF9C3', iconColor: '#854D0E' },
  { label: 'Da recuperare', seg: 'winback' as Segment, Icon: RefreshCw,  iconBg: '#FFF7ED', iconColor: '#9A3412' },
  { label: 'Persi',         seg: 'persi'   as Segment, Icon: UserX,      iconBg: '#FEF2F2', iconColor: '#991B1B' },
]

const CARD_BASE: React.CSSProperties = {
  background:   '#FFFFFF',
  border:       '1px solid #F0F0F0',
  borderRadius: 16,
  padding:      20,
}

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

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function KpiCardItem({
  label, count, Icon, iconBg, iconColor,
}: {
  label: string
  count: number
  Icon:  React.ComponentType<{ size?: number; color?: string }>
  iconBg:    string
  iconColor: string
}) {
  const [hov, setHov] = React.useState(false)
  return (
    <div
      style={{
        ...CARD_BASE,
        flex:       1,
        minWidth:   0,
        cursor:     'default',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
        transform:  hov ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow:  hov
          ? '0 4px 12px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(10,13,18,0.04)',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div
        style={{
          width:          40,
          height:         40,
          borderRadius:   100,
          background:     iconBg,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          marginBottom:   16,
        }}
      >
        <Icon size={18} color={iconColor} />
      </div>
      <p
        style={{
          margin:        0,
          fontSize:      11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color:         '#B0B0B0',
          fontWeight:    500,
          marginBottom:  8,
        }}
      >
        {label}
      </p>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: '#222222', lineHeight: 1.1 }}>
        {count}
      </p>
    </div>
  )
}

function KpiCardSkeleton() {
  return (
    <Card style={{ flex: 1, minWidth: 0, padding: 20 }}>
      <div style={{ background: '#F4F4F4', height: 40, width: 40, borderRadius: 100 }} />
      <div style={{ background: '#F4F4F4', height: 12, width: '50%', borderRadius: 4, marginTop: 16 }} />
      <div style={{ background: '#F4F4F4', height: 28, width: '40%', borderRadius: 6, marginTop: 12 }} />
    </Card>
  )
}

function ClientRow({ client, segment }: { client: RetentionClient; segment: Segment }) {
  const st = SUB_TABS.find((t) => t.key === segment)!
  return (
    <div
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #F0F0F0',
        borderRadius: 12,
        padding:      '14px 16px',
        marginBottom: 8,
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width:          36,
          height:         36,
          borderRadius:   100,
          background:     '#F5F5F5',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       12,
          fontWeight:     700,
          color:          '#222222',
          flexShrink:     0,
        }}
      >
        {initials(client.name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222222' }}>
          {client.name}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B0B0B0' }}>
          Ultimo: {client.lastService ?? 'N/D'} · {client.daysSinceVisit} giorni fa
        </p>
      </div>

      {/* Segment badge */}
      <span
        style={{
          fontSize:     11,
          fontWeight:   600,
          borderRadius: 100,
          padding:      '3px 10px',
          background:   st.activeBg,
          color:        st.activeColor,
          flexShrink:   0,
        }}
      >
        {st.label}
      </span>

      {/* Action button */}
      <button
        style={{
          fontSize:     12,
          fontWeight:   500,
          borderRadius: 8,
          padding:      '7px 12px',
          border:       'none',
          cursor:       'pointer',
          background:   '#222222',
          color:        '#FFFFFF',
          flexShrink:   0,
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

  /* ---------- loading ---------- */
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* KPI skeletons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <KpiCardSkeleton />
          <KpiCardSkeleton />
          <KpiCardSkeleton />
        </div>
        {/* List skeletons */}
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── KPI row ── */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {KPI_META.map(({ label, seg, Icon, iconBg, iconColor }) => (
          <KpiCardItem
            key={seg}
            label={label}
            count={counts[seg]}
            Icon={Icon}
            iconBg={iconBg}
            iconColor={iconColor}
          />
        ))}
      </div>

      {/* ── Sub-tab bar ── */}
      <div style={{ display: 'flex', gap: 6 }}>
        {SUB_TABS.map(({ key, label, activeColor, activeBg }) => {
          const isActive = active === key
          return (
            <button
              key={key}
              onClick={() => setActive(key)}
              style={{
                fontSize:     13,
                fontWeight:   500,
                padding:      '7px 14px',
                borderRadius: 100,
                border:       `1px solid ${isActive ? activeBg : '#E9E9E9'}`,
                background:   isActive ? activeBg : '#FFFFFF',
                color:        isActive ? activeColor : '#888888',
                cursor:       'pointer',
                transition:   'all 120ms ease',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ── Client list ── */}
      {clients.length === 0 ? (
        <Card style={{ padding: 48, textAlign: 'center' }}>
          <CheckCircle size={32} color="#16A34A" />
          <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 700, color: '#222222' }}>
            Tutto bene!
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#B0B0B0' }}>
            {EMPTY_MESSAGES[active]}
          </p>
        </Card>
      ) : (
        <div>
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} segment={active} />
          ))}
        </div>
      )}

    </div>
  )
}
