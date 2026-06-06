'use client'

import * as React from 'react'
import { Star, MessageSquare, TrendingUp } from 'lucide-react'
import { Card } from '@/components/dashboard/vendite/ui'
import { getReputazioneData, type ReputazioneData, type Review } from '@/lib/actions/marketing'

interface ReputazioneProps {
  tenantId: string
}

const REVIEWS_VISIBLE_DEFAULT = 5

interface KpiCardProps {
  label:      string
  value:      string
  subLabel?:  string
  subColor?:  string
  Icon:       React.ComponentType<{ size?: number; color?: string }>
  iconBg:     string
  iconColor:  string
}

function KpiCard({ label, value, subLabel, subColor, Icon, iconBg, iconColor }: KpiCardProps) {
  const [hover, setHover] = React.useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   '#FFFFFF',
        border:       '1px solid #F0F0F0',
        borderRadius: 16,
        padding:      20,
        flex:         1,
        transition:   'transform 200ms ease, box-shadow 200ms ease',
        transform:    hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow:    hover ? '0 4px 12px rgba(0,0,0,0.06)' : '0 1px 3px rgba(10,13,18,0.04)',
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 100,
          background: iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon size={20} color={iconColor} />
      </div>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#B0B0B0', marginBottom: 8, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 32, fontWeight: 700, color: '#222222', lineHeight: 1.1 }}>
        {value}
      </div>
      {subLabel && (
        <div style={{ fontSize: 12, color: subColor ?? '#B0B0B0', marginTop: 4 }}>
          {subLabel}
        </div>
      )}
    </div>
  )
}

function StarRating({ stars }: { stars: number }) {
  return (
    <span style={{ fontSize: 14 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < stars ? '#F59E0B' : '#E0E0E0' }}>
          {i < stars ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function npsSubLabel(nps: number | null): { text: string; color: string } | null {
  if (nps === null) return null
  if (nps >= 50) return { text: '(ottimo)',          color: '#16A34A' }
  if (nps >= 0)  return { text: '(buono)',            color: '#F59E0B' }
  return              { text: '(da migliorare)',     color: '#DC2626' }
}

function KpiSkeleton() {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #F0F0F0', borderRadius: 16, padding: 20, flex: 1 }}>
      <div style={{ background: '#F4F4F4', height: 40, width: 40, borderRadius: 100 }} />
      <div style={{ background: '#F4F4F4', height: 12, width: '50%', borderRadius: 4, marginTop: 16 }} />
      <div style={{ background: '#F4F4F4', height: 28, width: '40%', borderRadius: 6, marginTop: 12 }} />
    </div>
  )
}

function ReviewRow({ review, isLast }: { review: Review; isLast: boolean }) {
  return (
    <div style={{ padding: '16px 0', borderBottom: isLast ? 'none' : '1px solid #F5F5F5' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 32, height: 32, borderRadius: 100,
            background: '#F5F5F5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#222222', flexShrink: 0,
          }}
        >
          {getInitials(review.clientName)}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>{review.clientName}</span>
        <StarRating stars={review.rating} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#B0B0B0' }}>
          {new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' }).format(new Date(review.createdAt))}
        </span>
      </div>

      {/* Body */}
      <p style={{ margin: '6px 0 10px', fontSize: 13, lineHeight: 1.5, color: review.body ? '#555555' : '#B0B0B0', fontStyle: review.body ? 'normal' : 'italic' }}>
        {review.body ?? 'Nessun commento'}
      </p>

      {/* Reply preview */}
      {review.replyBody && (
        <div
          style={{
            background:   '#F9F9F9',
            borderRadius: 8,
            padding:      '10px 12px',
            fontSize:     12,
            marginBottom: 10,
          }}
        >
          <span style={{ fontWeight: 600, color: '#222222' }}>✍️ La tua risposta</span>
          <p style={{ margin: '4px 0 0', color: '#555555' }}>{review.replyBody}</p>
        </div>
      )}

      <button
        className="styll-btn-secondary"
        style={{ padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}
        onClick={() => {
          // TODO: inline reply form — not yet implemented
        }}
      >
        {review.replyBody ? 'Modifica risposta' : 'Rispondi'}
      </button>
    </div>
  )
}

export function Reputazione({ tenantId }: ReputazioneProps) {
  const [data,       setData]       = React.useState<ReputazioneData | null>(null)
  const [loading,    setLoading]    = React.useState(true)
  const [showAll,    setShowAll]    = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    getReputazioneData(tenantId)
      .then((r) => { if (!cancelled) { setData(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [tenantId])

  const avgText       = data?.avgRating !== null && data?.avgRating !== undefined
    ? `${data.avgRating.toFixed(1)} ★`
    : '—'
  const totalText     = data ? String(data.totalReviews) : '—'
  const npsRaw        = data?.nps ?? null
  const npsText       = npsRaw !== null ? String(Math.round(npsRaw)) : '—'
  const npsSub        = npsSubLabel(npsRaw)
  const visibleReviews = (data?.reviews ?? []).slice(0, showAll ? undefined : REVIEWS_VISIBLE_DEFAULT)
  const hasMore        = (data?.reviews.length ?? 0) > REVIEWS_VISIBLE_DEFAULT

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPI row ─────────────────────────────────────────────── */}
      <div className="vendite-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {loading ? (
          <><KpiSkeleton /><KpiSkeleton /><KpiSkeleton /></>
        ) : (
          <>
            <KpiCard
              label="Media recensioni"
              value={avgText}
              Icon={Star}
              iconBg="#FFF7ED"
              iconColor="#F59E0B"
            />
            <KpiCard
              label="Recensioni totali"
              value={totalText}
              Icon={MessageSquare}
              iconBg="#EFF6FF"
              iconColor="#2563EB"
            />
            <KpiCard
              label="NPS Score"
              value={npsText}
              subLabel={npsSub?.text}
              subColor={npsSub?.color}
              Icon={TrendingUp}
              iconBg="#F0FDF4"
              iconColor="#16A34A"
            />
          </>
        )}
      </div>

      {/* ── Reviews card ────────────────────────────────────────── */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#222222' }}>
            Recensioni recenti
          </p>
          {!loading && data && data.avgRating !== null && (
            <span
              style={{
                background:   '#FFF7ED',
                color:        '#F59E0B',
                borderRadius: 100,
                padding:      '4px 12px',
                fontSize:     13,
                fontWeight:   700,
              }}
            >
              {data.avgRating.toFixed(1)} ★
            </span>
          )}
        </div>

        <div style={{ height: 1, background: '#F0F0F0', marginBottom: 0 }} />

        {loading ? (
          /* Skeleton reviews */
          [0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background:   '#F4F4F4',
                borderRadius: 12,
                height:       80,
                margin:       '12px 0',
              }}
            />
          ))
        ) : !data || data.totalReviews === 0 ? (
          /* Empty state */
          <div style={{ padding: '32px 0', textAlign: 'center' }}>
            <Star size={32} color="#B0B0B0" />
            <p style={{ margin: '12px 0 0', fontSize: 16, fontWeight: 700, color: '#222222' }}>
              Nessuna recensione ancora.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#B0B0B0', maxWidth: 320, marginLeft: 'auto', marginRight: 'auto' }}>
              Configura la richiesta automatica qui sotto per iniziare a raccoglierle.
            </p>
          </div>
        ) : (
          <>
            {visibleReviews.map((review, i) => (
              <ReviewRow
                key={review.id}
                review={review}
                isLast={i === visibleReviews.length - 1 && (!hasMore || showAll)}
              />
            ))}
            {hasMore && !showAll && (
              <button
                className="styll-btn-secondary"
                style={{ marginTop: 8, width: '100%', padding: '10px', fontSize: 13, cursor: 'pointer' }}
                onClick={() => setShowAll(true)}
              >
                Vedi tutte ({data.reviews.length})
              </button>
            )}
          </>
        )}
      </Card>

      {/* ── CTA configura ───────────────────────────────────────── */}
      <div
        style={{
          background:     '#F9F9F9',
          borderRadius:   16,
          padding:        20,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            12,
          flexWrap:       'wrap',
        }}
      >
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#222222' }}>
            Richiesta automatica recensioni
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B0B0B0' }}>
            48h dopo ogni appuntamento completato
          </p>
        </div>
        <button
          className="styll-btn-primary"
          style={{ padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
        >
          Configura
        </button>
      </div>

    </div>
  )
}
