'use client'

import * as React from 'react'
import { Zap, Tag } from 'lucide-react'
import { getPromozioni, type Promozione } from '@/lib/actions/marketing'

interface PromozioniProps {
  tenantId: string
}

type SubTab = 'offerte' | 'lastminute'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'offerte',    label: 'Offerte'     },
  { key: 'lastminute', label: 'Last-minute' },
]

function formatExpiry(promo: Promozione): string {
  const now = new Date()
  if (!promo.expiresAt) return 'Nessuna scadenza'
  const d = new Date(promo.expiresAt)
  if (d < now) {
    return `Scaduta il ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(d)}`
  }
  return `Fino al ${new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(d)}`
}

function isPromoActive(promo: Promozione): boolean {
  if (!promo.isActive) return false
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return false
  return true
}

function OffertaCard({ promo }: { promo: Promozione }) {
  const [hover, setHover] = React.useState(false)
  const active = isPromoActive(promo)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #F0F0F0',
        borderRadius: 12,
        padding:      16,
        opacity:      active ? 1 : 0.55,
        transition:   'transform 200ms ease, box-shadow 200ms ease',
        transform:    hover && active ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow:    hover && active
          ? '0 4px 12px rgba(0,0,0,0.06)'
          : '0 1px 3px rgba(10,13,18,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#222222', lineHeight: 1.3 }}>
          {promo.title}
        </p>
        <span
          style={{
            background:   active ? '#F0FDF4' : '#F5F5F5',
            color:        active ? '#16A34A' : '#888888',
            borderRadius: 100,
            padding:      '3px 10px',
            fontSize:     11,
            fontWeight:   600,
            whiteSpace:   'nowrap',
            flexShrink:   0,
          }}
        >
          {active ? 'Attiva' : 'Scaduta'}
        </span>
      </div>

      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B0B0B0' }}>
        {formatExpiry(promo)}
      </p>

      <div style={{ marginTop: 16 }}>
        <span
          style={{
            background:   '#F5F5F5',
            borderRadius: 100,
            padding:      '4px 12px',
            fontSize:     12,
            fontWeight:   500,
            color:        '#222222',
          }}
        >
          {promo.usageCount} utilizzi
        </span>
      </div>
    </div>
  )
}

export function Promozioni({ tenantId }: PromozioniProps) {
  const [subTab,   setSubTab]   = React.useState<SubTab>('offerte')
  const [promos,   setPromos]   = React.useState<Promozione[] | null>(null)
  const [loading,  setLoading]  = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getPromozioni(tenantId)
      .then((r) => { if (!cancelled) { setPromos(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tenantId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Sub-tab bar */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SUB_TABS.map((t) => {
          const isActive = subTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setSubTab(t.key)}
              style={{
                padding:      '7px 14px',
                borderRadius: 100,
                fontSize:     13,
                fontWeight:   500,
                cursor:       'pointer',
                border:       isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                background:   isActive ? '#222222' : '#FFFFFF',
                color:        isActive ? '#FFFFFF' : '#222222',
                transition:   'all 120ms ease',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Offerte ────────────────────────────────────────────── */}
      {subTab === 'offerte' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222222' }}>
              Le tue offerte
            </p>
            {/* TODO: modal creazione */}
            <button
              className="styll-btn-primary"
              style={{ padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              + Nuova offerta
            </button>
          </div>

          {loading ? (
            /* Skeleton */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{ background: '#F4F4F4', borderRadius: 12, height: 120 }}
                />
              ))}
            </div>
          ) : !promos || promos.length === 0 ? (
            /* Empty state */
            <div
              style={{
                background:   '#FFFFFF',
                border:       '1px solid #F0F0F0',
                borderRadius: 16,
                padding:      48,
                textAlign:    'center',
                boxShadow:    '0 1px 3px rgba(10,13,18,0.04)',
              }}
            >
              <Tag size={32} color="#B0B0B0" />
              <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, color: '#222222' }}>
                Nessuna promozione attiva.
              </p>
              {/* TODO: modal creazione */}
              <button
                className="styll-btn-primary"
                style={{ marginTop: 16, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}
              >
                + Crea la prima offerta
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {promos.map((p) => <OffertaCard key={p.id} promo={p} />)}
            </div>
          )}
        </>
      )}

      {/* ── Last-minute ────────────────────────────────────────── */}
      {subTab === 'lastminute' && (
        <div
          style={{
            background:   '#FFFFFF',
            border:       '1px solid #F0F0F0',
            borderRadius: 16,
            padding:      48,
            textAlign:    'center',
            boxShadow:    '0 1px 3px rgba(10,13,18,0.04)',
          }}
        >
          <Zap size={36} color="#B0B0B0" />
          <p style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 700, color: '#222222' }}>
            Last-minute
          </p>
          <p style={{ margin: '8px auto 0', fontSize: 14, color: '#B0B0B0', maxWidth: 320 }}>
            Riempi gli slot vuoti con offerte automatiche nelle ore libere.
          </p>
          <span
            style={{
              display:      'inline-block',
              marginTop:    16,
              background:   '#F5F5F5',
              color:        '#888888',
              borderRadius: 100,
              padding:      '5px 16px',
              fontSize:     12,
              fontWeight:   600,
            }}
          >
            Disponibile in v2
          </span>
        </div>
      )}

    </div>
  )
}
