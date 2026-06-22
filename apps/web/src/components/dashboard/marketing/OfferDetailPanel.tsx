'use client'

import * as React from 'react'
import Image from 'next/image'
import { StyllModal } from '@/components/ui/styll-modal'
import {
  getOffertaAnalytics,
  resetNotificationIdempotenza,
  deleteOfferta,
  updateOffertaStatus,
  duplicateOfferta,
  type PromotionRow,
  type OffertaAnalytics,
  type PromotionStatus,
} from '@/lib/actions/offers'

const STATUS_STYLES: Record<PromotionStatus, { bg: string; color: string; label: string }> = {
  draft:    { bg: '#F5F5F5', color: '#888888', label: 'Bozza' },
  active:   { bg: '#F0FDF4', color: '#16A34A', label: 'Attiva' },
  expired:  { bg: '#FEF2F2', color: '#DC2626', label: 'Scaduta' },
  archived: { bg: '#F5F5F5', color: '#B0B0B0', label: 'Archiviata' },
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
}

function formatEur(v: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v)
}

const secBtnStyle: React.CSSProperties = {
  padding: '12px 20px', borderRadius: 12, border: '1.5px solid #E5E5E5',
  background: '#FFF', color: '#222', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', width: '100%', textAlign: 'center',
}

const dangerBtnStyle: React.CSSProperties = {
  padding: '12px 20px', borderRadius: 12, border: '1.5px solid #FECACA',
  background: '#FFF', color: '#DC2626', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', width: '100%', textAlign: 'center',
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#B0B0B0', letterSpacing: '0.08em',
  textTransform: 'uppercase', margin: '0 0 8px',
}

interface Props {
  row: PromotionRow
  onClose: () => void
  onModifica: (row: PromotionRow) => void
  onMutate: () => void
}

export function OfferDetailPanel({ row, onClose, onModifica, onMutate }: Props) {
  const [analytics, setAnalytics] = React.useState<OffertaAnalytics | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState<'notify' | 'delete' | null>(null)

  React.useEffect(() => {
    getOffertaAnalytics(row.id, row.tenant_id).then(setAnalytics).catch(() => {})
  }, [row.id, row.tenant_id])

  const st = STATUS_STYLES[row.status]
  const allItems = [...row.service_items, ...row.product_items]

  async function handleNotificaDiNuovo() {
    setBusy(true)
    setConfirm(null)
    try {
      await resetNotificationIdempotenza(row.id, row.tenant_id)
      await fetch(`/api/promotions/${row.id}/notify`, { method: 'POST' })
      setAnalytics(null)
      getOffertaAnalytics(row.id, row.tenant_id).then(setAnalytics).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setBusy(true)
    setConfirm(null)
    try {
      await deleteOfferta(row.id, row.tenant_id)
      onMutate()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function handleStatusAction(action: 'pause' | 'archive') {
    setBusy(true)
    try {
      const nextStatus: PromotionStatus = action === 'pause' ? 'draft' : 'archived'
      await updateOffertaStatus(row.id, nextStatus, row.tenant_id)
      onMutate()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicate() {
    setBusy(true)
    try {
      await duplicateOfferta(row.id, row.tenant_id)
      onMutate()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  async function handlePublish() {
    setBusy(true)
    try {
      await updateOffertaStatus(row.id, 'active', row.tenant_id)
      onMutate()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  function renderConfirmDialog() {
    if (!confirm) return null
    const isNotify = confirm === 'notify'
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#FFF', borderRadius: 20, padding: 24, maxWidth: 360, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#222' }}>
            {isNotify ? 'Invia notifica' : 'Elimina promozione'}
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: '#555', lineHeight: 1.5 }}>
            {isNotify
              ? "Stai per inviare una notifica push a tutti i tuoi clienti con l'app. Vuoi continuare?"
              : 'La promozione verrà eliminata definitivamente. Vuoi continuare?'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setConfirm(null)} style={{ padding: '10px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5', background: '#FFF', color: '#222', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              Annulla
            </button>
            <button
              type="button"
              onClick={isNotify ? handleNotificaDiNuovo : handleDelete}
              style={{ padding: '10px 16px', borderRadius: 12, border: 'none', background: isNotify ? '#222' : '#DC2626', color: '#FFF', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              {isNotify ? 'Invia' : 'Elimina'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderPreview() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {row.cover_image_url && (
          <div style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#F4F4F4' }}>
            <Image fill src={row.cover_image_url} alt={row.title} sizes="560px" style={{ objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#222', flex: 1 }}>{row.title}</h3>
          <span style={{ fontSize: 11, fontWeight: 600, background: st.bg, color: st.color, borderRadius: 100, padding: '3px 10px', flexShrink: 0, marginTop: 3 }}>
            {st.label}
          </span>
        </div>

        {allItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {allItems.map((item, i) => {
              const name = 'serviceName' in item ? item.serviceName : item.productName
              const discStr = item.discount_type === 'percent' ? `-${item.discount_value}%` : `-€${item.discount_value}`
              return (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8F8F8', borderRadius: 10 }}>
                  <span style={{ fontSize: 14, color: '#222' }}>{name}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#16A34A' }}>{discStr}</span>
                </div>
              )
            })}
          </div>
        )}

        <p style={{ margin: 0, fontSize: 13, color: '#888' }}>
          {row.valid_until
            ? `Dal ${formatDate(row.valid_from)} al ${formatDate(row.valid_until)}`
            : `Dal ${formatDate(row.valid_from)} · Senza scadenza`}
        </p>

        {row.description && (
          <p style={{ margin: 0, fontSize: 14, color: '#555', lineHeight: 1.6 }}>{row.description}</p>
        )}
      </div>
    )
  }

  function renderAnalytics() {
    const metrics = [
      {
        label: 'Notifiche inviate',
        value: analytics === null ? '…' : analytics.notificheInviate === 0 ? '—' : String(analytics.notificheInviate),
        icon: '📨',
      },
      {
        label: 'Prenotazioni',
        value: analytics === null ? '…' : String(analytics.prenotazioniGenerate),
        icon: '🗓',
      },
      {
        label: 'Revenue',
        value: analytics === null ? '…' : formatEur(analytics.revenueGenerato),
        icon: '💶',
      },
    ]
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {metrics.map((m) => (
          <div key={m.label} style={{ background: '#F8F8F8', borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{m.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#222' }}>{m.value}</div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{m.label}</div>
          </div>
        ))}
      </div>
    )
  }

  function renderActions() {
    const { status } = row
    const disabled = busy

    if (status === 'draft') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" disabled={disabled} onClick={handlePublish} className="styll-btn-primary" style={{ padding: '12px 20px', fontSize: 14, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'center', width: '100%' }}>
            {busy ? 'Salvataggio…' : 'Pubblica'}
          </button>
          <button type="button" disabled={disabled} onClick={() => onModifica(row)} style={secBtnStyle}>Modifica</button>
          <button type="button" disabled={disabled} onClick={() => setConfirm('delete')} style={dangerBtnStyle}>Elimina</button>
        </div>
      )
    }

    if (status === 'active') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" disabled={disabled} onClick={() => setConfirm('notify')} style={secBtnStyle}>Notifica di nuovo</button>
          <button type="button" disabled={disabled} onClick={() => handleStatusAction('pause')} style={secBtnStyle}>Metti in pausa</button>
          <button type="button" disabled={disabled} onClick={() => onModifica(row)} style={secBtnStyle}>Modifica</button>
        </div>
      )
    }

    if (status === 'expired') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button type="button" disabled={disabled} onClick={handleDuplicate} style={secBtnStyle}>Duplica</button>
          <button type="button" disabled={disabled} onClick={() => handleStatusAction('archive')} style={secBtnStyle}>Archivia</button>
        </div>
      )
    }

    if (status === 'archived') {
      return (
        <button type="button" disabled={disabled} onClick={handleDuplicate} style={secBtnStyle}>Duplica</button>
      )
    }

    return null
  }

  return (
    <>
      <StyllModal open onClose={onClose} title="Dettaglio offerta" size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={sectionLabelStyle}>Anteprima</p>
            {renderPreview()}
          </div>
          <div>
            <p style={sectionLabelStyle}>Analytics</p>
            {renderAnalytics()}
          </div>
          <div>
            <p style={sectionLabelStyle}>Azioni</p>
            {renderActions()}
          </div>
        </div>
      </StyllModal>
      {renderConfirmDialog()}
    </>
  )
}
