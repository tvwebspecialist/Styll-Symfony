'use client'

import * as React from 'react'
import Image from 'next/image'
import { Zap, Tag, Plus, MoreHorizontal, Copy, Archive, Play, Pause } from 'lucide-react'
import {
  getOfferte,
  updateOffertaStatus,
  duplicateOfferta,
  type PromotionRow,
  type PromotionStatus,
} from '@/lib/actions/offers'
import { OfferForm } from '@/components/dashboard/marketing/OfferForm'
import { OfferDetailPanel } from '@/components/dashboard/marketing/OfferDetailPanel'

interface PromozioniProps {
  tenantId: string
}

type SubTab = 'offerte' | 'lastminute'

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'offerte', label: 'Offerte' },
  { key: 'lastminute', label: 'Last-minute' },
]

const STATUS_STYLES: Record<PromotionStatus, { bg: string; color: string; label: string }> = {
  draft:    { bg: '#F5F5F5', color: '#888888', label: 'Bozza' },
  active:   { bg: '#F0FDF4', color: '#16A34A', label: 'Attiva' },
  expired:  { bg: '#FEF2F2', color: '#DC2626', label: 'Scaduta' },
  archived: { bg: '#F5F5F5', color: '#B0B0B0', label: 'Archiviata' },
}

function formatDateRange(validFrom: string, validUntil: string | null): string {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(d))
  if (!validUntil) return `Dal ${fmt(validFrom)}`
  return `${fmt(validFrom)} – ${fmt(validUntil)}`
}

function summarizeDiscounts(row: PromotionRow): string | null {
  const all = [
    ...row.service_items.map((s) => ({ type: s.discount_type, value: s.discount_value })),
    ...row.product_items.map((p) => ({ type: p.discount_type, value: p.discount_value })),
  ]
  if (all.length === 0) return null
  if (all.length === 1) {
    const { type, value } = all[0]
    return type === 'percent' ? `-${value}%` : `-€${value}`
  }
  const uniquePercent = [...new Set(all.filter((a) => a.type === 'percent').map((a) => a.value))]
  const uniqueFixed = [...new Set(all.filter((a) => a.type === 'fixed').map((a) => a.value))]
  if (uniquePercent.length === 1 && uniqueFixed.length === 0) return `-${uniquePercent[0]}%`
  if (uniqueFixed.length === 1 && uniquePercent.length === 0) return `-€${uniqueFixed[0]}`
  return 'Sconto multiplo'
}

function ActionMenu({
  row,
  onAction,
}: {
  row: PromotionRow
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
    { label: 'Attiva',        icon: <Play size={14} />,    action: 'activate',  show: row.status === 'draft' },
    { label: 'Metti in pausa', icon: <Pause size={14} />,  action: 'pause',     show: row.status === 'active' },
    { label: 'Duplica',       icon: <Copy size={14} />,    action: 'duplicate', show: true },
    { label: 'Archivia',      icon: <Archive size={14} />, action: 'archive',   show: row.status !== 'archived' },
  ]

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex', borderRadius: 6, color: '#888' }}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#FFF', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #F0F0F0', minWidth: 160, zIndex: 100, overflow: 'hidden' }}>
          {items.filter((i) => i.show).map((item) => (
            <button key={item.action} type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onAction(item.action) }} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#222', textAlign: 'left' }}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PromotionCard({
  row,
  tenantId,
  onMutate,
  onOpenDetail,
}: {
  row: PromotionRow
  tenantId: string
  onMutate: () => void
  onOpenDetail: (row: PromotionRow) => void
}) {
  const [busy, setBusy] = React.useState(false)
  const st = STATUS_STYLES[row.status]
  const discountSummary = summarizeDiscounts(row)
  const allItems = [...row.service_items, ...row.product_items]

  async function handleAction(action: 'activate' | 'pause' | 'archive' | 'duplicate') {
    setBusy(true)
    try {
      if (action === 'duplicate') {
        await duplicateOfferta(row.id, tenantId)
      } else {
        const nextStatus: PromotionStatus =
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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(row)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDetail(row) }}
      style={{ background: '#FFFFFF', border: '1px solid #F0F0F0', borderRadius: 14, padding: 16, opacity: busy ? 0.6 : 1, transition: 'opacity 150ms', boxShadow: '0 1px 3px rgba(10,13,18,0.04)', cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Thumbnail */}
        <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, position: 'relative', background: '#E5E7EB' }}>
          {row.cover_image_url ? (
            <Image fill src={row.cover_image_url} alt="" sizes="40px" style={{ objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #D1D5DB 0%, #9CA3AF 100%)' }} />
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, borderRadius: 100, padding: '2px 8px' }}>
                {st.label}
              </span>
              {discountSummary && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF7ED', color: '#EA580C', borderRadius: 100, padding: '2px 8px' }}>
                  {discountSummary}
                </span>
              )}
              {row.show_in_app && (
                <span style={{ fontSize: 10, background: '#F0F9FF', color: '#0369A1', borderRadius: 100, padding: '2px 6px', fontWeight: 600 }}>PWA</span>
              )}
              {row.show_on_landing && (
                <span style={{ fontSize: 10, background: '#FDF4FF', color: '#7E22CE', borderRadius: 100, padding: '2px 6px', fontWeight: 600 }}>Landing</span>
              )}
            </div>
            <ActionMenu row={row} onAction={handleAction} />
          </div>

          <p style={{ margin: '6px 0 2px', fontSize: 15, fontWeight: 700, color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#B0B0B0' }}>{formatDateRange(row.valid_from, row.valid_until)}</p>
        </div>
      </div>

      {allItems.length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {allItems.slice(0, 4).map((item, i) => (
            <span key={i} style={{ fontSize: 11, background: '#F5F5F5', color: '#555', borderRadius: 100, padding: '2px 8px' }}>
              {'serviceName' in item ? item.serviceName : item.productName}
              {' '}
              <span style={{ color: '#16A34A', fontWeight: 600 }}>
                {item.discount_type === 'percent' ? `-${item.discount_value}%` : `-€${item.discount_value}`}
              </span>
            </span>
          ))}
          {allItems.length > 4 && (
            <span style={{ fontSize: 11, color: '#B0B0B0', padding: '2px 4px' }}>+{allItems.length - 4} altri</span>
          )}
        </div>
      )}
    </div>
  )
}

export function Promozioni({ tenantId }: PromozioniProps) {
  const [subTab, setSubTab] = React.useState<SubTab>('offerte')
  const [promotions, setPromotions] = React.useState<PromotionRow[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [showForm, setShowForm] = React.useState(false)
  const [editOffer, setEditOffer] = React.useState<PromotionRow | null>(null)
  const [detailOffer, setDetailOffer] = React.useState<PromotionRow | null>(null)
  const [filterStatus, setFilterStatus] = React.useState<PromotionStatus | 'all'>('all')

  function load() {
    setLoading(true)
    getOfferte(tenantId)
      .then((r) => { setPromotions(r); setLoading(false) })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => { load() }, [tenantId])

  const filtered = React.useMemo(() => {
    if (!promotions) return []
    if (filterStatus === 'all') return promotions
    return promotions.filter((p) => p.status === filterStatus)
  }, [promotions, filterStatus])

  const statusFilters: { key: PromotionStatus | 'all'; label: string }[] = [
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
            <button key={t.key} onClick={() => setSubTab(t.key)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: isActive ? '1px solid #222222' : '1px solid #E9E9E9', background: isActive ? '#222222' : '#FFFFFF', color: isActive ? '#FFFFFF' : '#222222', transition: 'all 120ms ease' }}>
              {t.label}
            </button>
          )
        })}
      </div>

      {subTab === 'offerte' && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222' }}>Le tue promozioni</p>
            <button className="styll-btn-primary" onClick={() => setShowForm(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>
              <Plus size={15} />
              Nuova promozione
            </button>
          </div>

          {!loading && promotions && promotions.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {statusFilters.map((f) => {
                const active = filterStatus === f.key
                return (
                  <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{ padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: active ? '1px solid #222' : '1px solid #E9E9E9', background: active ? '#222' : '#FFF', color: active ? '#FFF' : '#666' }}>
                    {f.label}
                  </button>
                )
              })}
            </div>
          )}

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ background: '#F4F4F4', borderRadius: 14, height: 130 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#FFF', border: '1px solid #F0F0F0', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(10,13,18,0.04)' }}>
              <Tag size={32} color="#B0B0B0" />
              <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, color: '#222' }}>
                {filterStatus === 'all' ? 'Nessuna promozione ancora.' : `Nessuna promozione ${STATUS_STYLES[filterStatus as PromotionStatus]?.label.toLowerCase()}.`}
              </p>
              {filterStatus === 'all' && (
                <button className="styll-btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
                  + Crea la prima promozione
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.map((p) => (
                <PromotionCard key={p.id} row={p} tenantId={tenantId} onMutate={load} onOpenDetail={setDetailOffer} />
              ))}
            </div>
          )}
        </>
      )}

      {subTab === 'lastminute' && (
        <div style={{ background: '#FFF', border: '1px solid #F0F0F0', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(10,13,18,0.04)' }}>
          <Zap size={36} color="#B0B0B0" />
          <p style={{ margin: '16px 0 0', fontSize: 22, fontWeight: 700, color: '#222' }}>Last-minute</p>
          <p style={{ margin: '8px auto 0', fontSize: 14, color: '#B0B0B0', maxWidth: 320 }}>Riempi gli slot vuoti con offerte automatiche nelle ore libere.</p>
          <span style={{ display: 'inline-block', marginTop: 16, background: '#F5F5F5', color: '#888', borderRadius: 100, padding: '5px 16px', fontSize: 12, fontWeight: 600 }}>Disponibile in v2</span>
        </div>
      )}

      {showForm && (
        <OfferForm
          tenantId={tenantId}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load() }}
        />
      )}

      {editOffer && (
        <OfferForm
          tenantId={tenantId}
          initialData={editOffer}
          onClose={() => setEditOffer(null)}
          onSuccess={() => { setEditOffer(null); load() }}
        />
      )}

      {detailOffer && (
        <OfferDetailPanel
          row={detailOffer}
          onClose={() => setDetailOffer(null)}
          onModifica={(row) => { setDetailOffer(null); setEditOffer(row) }}
          onMutate={() => { setDetailOffer(null); load() }}
        />
      )}
    </div>
  )
}
