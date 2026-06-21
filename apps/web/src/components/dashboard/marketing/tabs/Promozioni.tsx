'use client'

import * as React from 'react'
import { Zap, Tag, Plus, MoreHorizontal, Copy, Archive, Play, Pause } from 'lucide-react'
import {
  getOfferte,
  updateOffertaStatus,
  duplicateOfferta,
  type OfferRow,
  type OfferStatus,
} from '@/lib/actions/offers'
import { OfferForm } from '@/components/dashboard/marketing/OfferForm'

interface PromozioniProps {
  tenantId: string
}

type SubTab = 'offerte' | 'lastminute'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'offerte', label: 'Offerte' },
  { key: 'lastminute', label: 'Last-minute' },
]

const STATUS_STYLES: Record<OfferStatus, { bg: string; color: string; label: string }> = {
  draft:    { bg: '#F5F5F5', color: '#888888', label: 'Bozza' },
  active:   { bg: '#F0FDF4', color: '#16A34A', label: 'Attiva' },
  expired:  { bg: '#FEF2F2', color: '#DC2626', label: 'Scaduta' },
  archived: { bg: '#F5F5F5', color: '#B0B0B0', label: 'Archiviata' },
}

function formatDateRange(startsAt: string, endsAt: string | null): string {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(d))
  if (!endsAt) return `Dal ${fmt(startsAt)}`
  return `${fmt(startsAt)} – ${fmt(endsAt)}`
}

function formatDiscount(row: OfferRow): string | null {
  if (row.offer_type !== 'catalog') return null
  if (!row.discount_type || row.discount_value == null) return null
  return row.discount_type === 'percentage'
    ? `-${row.discount_value}%`
    : `-€${row.discount_value}`
}

function TargetBadge({ row }: { row: OfferRow }) {
  const labels: Record<string, string> = {
    all: 'Tutti i clienti',
    churn_red: 'Da recuperare',
    churn_yellow: 'A rischio',
    vip: 'VIP',
    new: 'Nuovi clienti',
  }
  const key = row.target_type === 'all' ? 'all' : (row.target_segment ?? 'all')
  return (
    <span style={{ fontSize: 11, color: '#888', background: '#F5F5F5', borderRadius: 100, padding: '2px 8px' }}>
      {labels[key] ?? key}
    </span>
  )
}

function ActionMenu({
  row,
  onAction,
}: {
  row: OfferRow
  onAction: (action: 'activate' | 'pause' | 'archive' | 'duplicate') => void
}) {
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const items: { label: string; icon: React.ReactNode; action: 'activate' | 'pause' | 'archive' | 'duplicate'; show: boolean }[] = [
    {
      label: 'Attiva', icon: <Play size={14} />, action: 'activate',
      show: row.status === 'draft',
    },
    {
      label: 'Metti in pausa', icon: <Pause size={14} />, action: 'pause',
      show: row.status === 'active',
    },
    {
      label: 'Duplica', icon: <Copy size={14} />, action: 'duplicate',
      show: true,
    },
    {
      label: 'Archivia', icon: <Archive size={14} />, action: 'archive',
      show: row.status !== 'archived',
    },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6, color: '#888' }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#FFF',
          borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #F0F0F0',
          minWidth: 160, zIndex: 100, overflow: 'hidden',
        }}>
          {items.filter((i) => i.show).map((item) => (
            <button
              key={item.action}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onAction(item.action)
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
                border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#222',
                textAlign: 'left',
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function OfferCard({
  row,
  onMutate,
  tenantId,
}: {
  row: OfferRow
  tenantId: string
  onMutate: () => void
}) {
  const [busy, setBusy] = React.useState(false)
  const st = STATUS_STYLES[row.status]
  const discount = formatDiscount(row)

  async function handleAction(action: 'activate' | 'pause' | 'archive' | 'duplicate') {
    setBusy(true)
    try {
      if (action === 'duplicate') {
        await duplicateOfferta(row.id, tenantId)
      } else {
        const nextStatus: OfferStatus =
          action === 'activate' ? 'active' :
          action === 'pause'    ? 'draft'  : 'archived'
        await updateOffertaStatus(row.id, nextStatus, tenantId)
      }
      onMutate()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #F0F0F0', borderRadius: 14,
      padding: 16, opacity: busy ? 0.6 : 1, transition: 'opacity 150ms',
      boxShadow: '0 1px 3px rgba(10,13,18,0.04)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 600, background: '#F5F5F5', color: '#666', borderRadius: 100, padding: '2px 8px' }}>
            {row.offer_type === 'catalog' ? 'Catalogo' : 'Testo libero'}
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, borderRadius: 100, padding: '2px 8px' }}>
            {st.label}
          </span>
          {discount && (
            <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF7ED', color: '#EA580C', borderRadius: 100, padding: '2px 8px' }}>
              {discount}
            </span>
          )}
        </div>
        <ActionMenu row={row} onAction={handleAction} />
      </div>

      {/* Title */}
      <p style={{ margin: '10px 0 4px', fontSize: 15, fontWeight: 700, color: '#222' }}>
        {row.title}
      </p>

      {/* Date range */}
      <p style={{ margin: 0, fontSize: 12, color: '#B0B0B0' }}>
        {formatDateRange(row.starts_at, row.ends_at)}
      </p>

      {/* Target + stats */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, flexWrap: 'wrap', gap: 6 }}>
        <TargetBadge row={row} />
        {(row.recipients_notified > 0 || row.recipients_viewed > 0 || row.recipients_converted > 0) && (
          <div style={{ display: 'flex', gap: 12 }}>
            {row.recipients_notified > 0 && (
              <span style={{ fontSize: 11, color: '#888' }}>
                <strong style={{ color: '#444' }}>{row.recipients_notified}</strong> notificati
              </span>
            )}
            {row.recipients_viewed > 0 && (
              <span style={{ fontSize: 11, color: '#888' }}>
                <strong style={{ color: '#444' }}>{row.recipients_viewed}</strong> visti
              </span>
            )}
            {row.recipients_converted > 0 && (
              <span style={{ fontSize: 11, color: '#888' }}>
                <strong style={{ color: '#16A34A' }}>{row.recipients_converted}</strong> conversioni
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function Promozioni({ tenantId }: PromozioniProps) {
  const [subTab, setSubTab] = React.useState<SubTab>('offerte')
  const [offers, setOffers] = React.useState<OfferRow[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [filterStatus, setFilterStatus] = React.useState<OfferStatus | 'all'>('all')

  function load() {
    setLoading(true)
    getOfferte(tenantId)
      .then((r) => { setOffers(r); setLoading(false) })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => { load() }, [tenantId])

  const filtered = React.useMemo(() => {
    if (!offers) return []
    if (filterStatus === 'all') return offers
    return offers.filter((o) => o.status === filterStatus)
  }, [offers, filterStatus])

  const statusFilters: { key: OfferStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'Tutte' },
    { key: 'active', label: 'Attive' },
    { key: 'draft', label: 'Bozze' },
    { key: 'expired', label: 'Scadute' },
    { key: 'archived', label: 'Archiviate' },
  ]

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
                padding: '7px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', border: isActive ? '1px solid #222222' : '1px solid #E9E9E9',
                background: isActive ? '#222222' : '#FFFFFF', color: isActive ? '#FFFFFF' : '#222222',
                transition: 'all 120ms ease',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Offerte ─────────────────────────────────────────────── */}
      {subTab === 'offerte' && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222' }}>Le tue offerte</p>
            <button
              className="styll-btn-primary"
              onClick={() => setShowForm(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}
            >
              <Plus size={15} />
              Nuova offerta
            </button>
          </div>

          {/* Status filters */}
          {!loading && offers && offers.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusFilters.map((f) => {
                const active = filterStatus === f.key
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilterStatus(f.key)}
                    style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', border: active ? '1px solid #222' : '1px solid #E9E9E9',
                      background: active ? '#222' : '#FFF', color: active ? '#FFF' : '#666',
                    }}
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ background: '#F4F4F4', borderRadius: 14, height: 130 }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              background: '#FFF', border: '1px solid #F0F0F0', borderRadius: 16,
              padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(10,13,18,0.04)',
            }}>
              <Tag size={32} color="#B0B0B0" />
              <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, color: '#222' }}>
                {filterStatus === 'all' ? 'Nessuna offerta ancora.' : `Nessuna offerta ${STATUS_STYLES[filterStatus as OfferStatus]?.label.toLowerCase()}.`}
              </p>
              {filterStatus === 'all' && (
                <button
                  className="styll-btn-primary"
                  onClick={() => setShowForm(true)}
                  style={{ marginTop: 16, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}
                >
                  + Crea la prima offerta
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.map((o) => (
                <OfferCard key={o.id} row={o} tenantId={tenantId} onMutate={load} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Last-minute ─────────────────────────────────────────── */}
      {subTab === 'lastminute' && (
        <div style={{
          background: '#FFF', border: '1px solid #F0F0F0', borderRadius: 16,
          padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(10,13,18,0.04)',
        }}>
          <Zap size={36} color="#B0B0B0" />
          <p style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 700, color: '#222' }}>Last-minute</p>
          <p style={{ margin: '8px auto 0', fontSize: 14, color: '#B0B0B0', maxWidth: 320 }}>
            Riempi gli slot vuoti con offerte automatiche nelle ore libere.
          </p>
          <span style={{
            display: 'inline-block', marginTop: 16, background: '#F5F5F5',
            color: '#888', borderRadius: 100, padding: '5px 16px', fontSize: 12, fontWeight: 600,
          }}>
            Disponibile in v2
          </span>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <OfferForm
          tenantId={tenantId}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}
