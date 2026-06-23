'use client'

import * as React from 'react'
import Image from 'next/image'
import { Zap, Tag, Plus, ChevronRight } from 'lucide-react'
import {
  getOfferte,
  type PromotionRow,
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


function buildDiscountLabel(row: PromotionRow): string | null {
  const all = [
    ...row.service_items.map((s) => ({ type: s.discount_type, value: s.discount_value })),
    ...row.product_items.map((p) => ({ type: p.discount_type, value: p.discount_value })),
  ]
  if (all.length === 0) return null
  if (all.length === 1) {
    const { type, value } = all[0]
    return type === 'percent' ? `${value}% Sconto` : `€${value} Sconto`
  }
  const pctMax = all.filter((a) => a.type === 'percent').reduce((m, a) => Math.max(m, a.value), 0)
  const fixMax = all.filter((a) => a.type === 'fixed').reduce((m, a) => Math.max(m, a.value), 0)
  if (pctMax > 0) return `Fino al ${pctMax}% Sconto`
  if (fixMax > 0) return `Fino a €${fixMax} Sconto`
  return null
}

function PromotionCard({
  row,
  onOpenDetail,
}: {
  row: PromotionRow
  onOpenDetail: (row: PromotionRow) => void
}) {
  const discountLabel = buildDiscountLabel(row)
  const isInactive = row.status !== 'active'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenDetail(row)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpenDetail(row) }}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        opacity: isInactive ? 0.5 : 1,
        transition: 'opacity 150ms',
      }}
    >
      {/* 16:9 cover with overlay */}
      <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%', background: 'linear-gradient(135deg, #27272A 0%, #3F3F46 100%)' }}>
        {row.cover_image_url && (
          <Image
            fill
            src={row.cover_image_url}
            alt={row.title}
            sizes="(max-width: 768px) 100vw, 360px"
            style={{ objectFit: 'cover' }}
          />
        )}
        {/* White overlay box */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          background: '#FFFFFF',
          borderRadius: 12,
          padding: '12px 14px',
        }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#18181B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {row.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#18181B' }}>
              {discountLabel ?? 'Informativa'}
            </span>
            <ChevronRight size={20} color="#A1A1AA" style={{ flexShrink: 0 }} />
          </div>
        </div>
      </div>
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

  function load() {
    setLoading(true)
    getOfferte(tenantId)
      .then((r) => { setPromotions(r); setLoading(false) })
      .catch(() => setLoading(false))
  }

  React.useEffect(() => { load() }, [tenantId])

  const sorted = React.useMemo(() => {
    if (!promotions) return []
    return [
      ...promotions.filter((o) => o.status === 'active'),
      ...promotions.filter((o) => o.status !== 'active'),
    ]
  }, [promotions])

  const activeCount = sorted.filter((o) => o.status === 'active').length
  const hasInactive = sorted.some((o) => o.status !== 'active')

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

          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ background: '#F4F4F4', borderRadius: 14, aspectRatio: '4/3' }} />)}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ background: '#FFF', border: '1px solid #F0F0F0', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 1px 3px rgba(10,13,18,0.04)' }}>
              <Tag size={32} color="#B0B0B0" />
              <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 600, color: '#222' }}>Nessuna promozione ancora.</p>
              <button className="styll-btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: 16, padding: '10px 20px', fontSize: 13, cursor: 'pointer' }}>
                + Crea la prima promozione
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {sorted.map((p, i) => (
                <React.Fragment key={p.id}>
                  {i === activeCount && hasInactive && activeCount > 0 && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center' }}>
                      <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                      <span style={{ padding: '0 12px', fontSize: 11, color: '#9CA3AF', fontWeight: 500, background: '#FFFFFF' }}>Non attive</span>
                      <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                    </div>
                  )}
                  <PromotionCard
                    row={p}
                    onOpenDetail={setDetailOffer}
                  />
                </React.Fragment>
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
