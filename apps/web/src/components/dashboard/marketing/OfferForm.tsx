'use client'

import * as React from 'react'
import { X, Tag, FileText, ChevronDown } from 'lucide-react'
import {
  createOfferta,
  getCatalogoPerOfferta,
  getSegmentEstimate,
  type OfferType,
  type DiscountType,
  type TargetType,
  type TargetSegment,
  type CatalogoItem,
} from '@/lib/actions/offers'
import { applyBestOffer } from '@/lib/utils/offer-pricing'

const SEGMENT_LABELS: Record<TargetSegment, string> = {
  churn_red: 'Da recuperare (assenti > 2× la loro media)',
  churn_yellow: 'A rischio (assenti > 1,4× la loro media)',
  vip: 'VIP (≥ 10 visite)',
  new: 'Nuovi (≤ 1 visita)',
}

function formatEur(val: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function inputStyle(disabled?: boolean): React.CSSProperties {
  return {
    width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E5E5E5',
    fontSize: 14, color: disabled ? '#B0B0B0' : '#222', background: disabled ? '#F8F8F8' : '#FFFFFF',
    outline: 'none', boxSizing: 'border-box',
  }
}

function labelStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' }
}

function fieldset(children: React.ReactNode, style?: React.CSSProperties) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>{children}</div>
}

interface Props {
  tenantId: string
  onSuccess: () => void
  onClose: () => void
}

export function OfferForm({ tenantId, onSuccess, onClose }: Props) {
  // Offer type
  const [offerType, setOfferType] = React.useState<OfferType>('catalog')

  // Common fields
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [targetType, setTargetType] = React.useState<TargetType>('all')
  const [targetSegment, setTargetSegment] = React.useState<TargetSegment>('churn_red')
  const [startsAt, setStartsAt] = React.useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); return d.toISOString().slice(0, 16)
  })
  const [endsAt, setEndsAt] = React.useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(23, 59, 0, 0)
    return d.toISOString().slice(0, 16)
  })

  // Catalog-specific
  const [discountType, setDiscountType] = React.useState<DiscountType>('percentage')
  const [discountValue, setDiscountValue] = React.useState('')
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<string[]>([])
  const [selectedProductIds, setSelectedProductIds] = React.useState<string[]>([])

  // Catalog data
  const [catalogo, setCatalogo] = React.useState<CatalogoItem[] | null>(null)
  const [segmentCount, setSegmentCount] = React.useState<number | null>(null)

  // UI state
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getCatalogoPerOfferta(tenantId).then(setCatalogo)
  }, [tenantId])

  // Estimate audience
  React.useEffect(() => {
    let cancelled = false
    setSegmentCount(null)
    getSegmentEstimate(tenantId, targetType, targetType === 'segment' ? targetSegment : null)
      .then((r) => { if (!cancelled) setSegmentCount(r.count) })
    return () => { cancelled = true }
  }, [tenantId, targetType, targetSegment])

  const services = catalogo?.filter((i) => i.type === 'service') ?? []
  const products = catalogo?.filter((i) => i.type === 'product') ?? []

  // Price previews
  const pricePreview = React.useMemo(() => {
    const val = parseFloat(discountValue)
    if (isNaN(val) || val <= 0) return []
    const allSelected = [...selectedServiceIds, ...selectedProductIds]
    return (catalogo ?? [])
      .filter((item) => allSelected.includes(item.id))
      .map((item) => {
        const { discountedPrice } = applyBestOffer(item.price, [{
          id: 'preview', title: '', discount_type: discountType, discount_value: val, starts_at: '',
        }])
        return { name: item.name, originalPrice: item.price, discountedPrice }
      })
  }, [catalogo, selectedServiceIds, selectedProductIds, discountType, discountValue])

  function toggleSelection(id: string, type: 'service' | 'product') {
    if (type === 'service') {
      setSelectedServiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    } else {
      setSelectedProductIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }
  }

  async function handleSubmit(status: 'draft' | 'active') {
    setError(null)
    if (!title.trim()) { setError('Inserisci un titolo per l\'offerta.'); return }
    if (offerType === 'catalog') {
      if (!discountValue || parseFloat(discountValue) <= 0) { setError('Inserisci uno sconto valido.'); return }
      if (discountType === 'percentage' && parseFloat(discountValue) > 100) { setError('La percentuale non può superare 100%.'); return }
      if (selectedServiceIds.length === 0 && selectedProductIds.length === 0) {
        setError('Seleziona almeno un servizio o prodotto.'); return
      }
    }
    if (new Date(endsAt) <= new Date(startsAt)) { setError('La data di fine deve essere successiva alla data di inizio.'); return }

    setSaving(true)
    try {
      const result = await createOfferta({
        tenantId,
        title: title.trim(),
        description: description.trim() || undefined,
        offer_type: offerType,
        discount_type: offerType === 'catalog' ? discountType : undefined,
        discount_value: offerType === 'catalog' ? parseFloat(discountValue) : undefined,
        target_type: targetType,
        target_segment: targetType === 'segment' ? targetSegment : undefined,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        status,
        service_ids: offerType === 'catalog' ? selectedServiceIds : undefined,
        product_ids: offerType === 'catalog' ? selectedProductIds : undefined,
      })
      if (!result.success) { setError(result.error ?? 'Errore durante il salvataggio.'); return }
      onSuccess()
    } catch {
      setError('Errore imprevisto. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#222', margin: 0 }}>Nuova offerta</h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={20} color="#888" />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Offer type switch */}
          <div>
            <span style={labelStyle()}>Tipo di offerta</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['catalog', 'free_text'] as OfferType[]).map((type) => {
                const active = offerType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setOfferType(type)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 8, padding: '10px 14px', borderRadius: 12, border: '1.5px solid',
                      borderColor: active ? '#222' : '#E5E5E5', background: active ? '#222' : '#FFF',
                      color: active ? '#FFF' : '#444', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      transition: 'all 120ms',
                    }}
                  >
                    {type === 'catalog' ? <Tag size={15} /> : <FileText size={15} />}
                    {type === 'catalog' ? 'Su catalogo' : 'Testo libero'}
                  </button>
                )
              })}
            </div>
            <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 6 }}>
              {offerType === 'catalog'
                ? 'Lo sconto si applica in automatico al prezzo al momento della prenotazione.'
                : 'Comunicativa pura: nessuno sconto automatico.'}
            </p>
          </div>

          {/* Title */}
          {fieldset(
            <>
              <label style={labelStyle()}>Titolo *</label>
              <input
                style={inputStyle()}
                placeholder={offerType === 'catalog' ? 'Es. "Sconto estate sui tagli"' : 'Es. "Porta un amico e ricevi un omaggio"'}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </>
          )}

          {/* Description */}
          {fieldset(
            <>
              <label style={labelStyle()}>Descrizione <span style={{ color: '#B0B0B0' }}>(facoltativa)</span></label>
              <textarea
                style={{ ...inputStyle(), resize: 'vertical', minHeight: 72 }}
                placeholder="Dettagli aggiuntivi visibili nella PWA cliente…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </>
          )}

          {/* CATALOG BRANCH */}
          {offerType === 'catalog' && (
            <>
              {/* Discount */}
              <div>
                <span style={labelStyle()}>Tipo sconto *</span>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  {(['percentage', 'fixed_amount'] as DiscountType[]).map((dt) => {
                    const active = discountType === dt
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setDiscountType(dt)}
                        style={{
                          flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid',
                          borderColor: active ? '#222' : '#E5E5E5', background: active ? '#222' : '#FFF',
                          color: active ? '#FFF' : '#444', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                          transition: 'all 120ms',
                        }}
                      >
                        {dt === 'percentage' ? 'Percentuale (%)' : 'Importo fisso (€)'}
                      </button>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    min="0"
                    max={discountType === 'percentage' ? '100' : undefined}
                    step="0.01"
                    style={{ ...inputStyle(), flex: 1 }}
                    placeholder={discountType === 'percentage' ? 'Es. 20' : 'Es. 5'}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                  />
                  <span style={{ fontSize: 16, fontWeight: 600, color: '#555', flexShrink: 0 }}>
                    {discountType === 'percentage' ? '%' : '€'}
                  </span>
                </div>
              </div>

              {/* Service selection */}
              {catalogo === null ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[0, 1, 2].map((i) => <div key={i} style={{ height: 36, background: '#F4F4F4', borderRadius: 8 }} />)}
                </div>
              ) : (
                <>
                  {services.length > 0 && (
                    <div>
                      <span style={labelStyle()}>Servizi inclusi nell'offerta</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {services.map((svc) => {
                          const checked = selectedServiceIds.includes(svc.id)
                          return (
                            <label key={svc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${checked ? '#222' : '#E9E9E9'}`, background: checked ? '#F5F5F5' : '#FFF', transition: 'all 120ms' }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleSelection(svc.id, 'service')} style={{ width: 16, height: 16, accentColor: '#222' }} />
                              <span style={{ flex: 1, fontSize: 14, color: '#222' }}>{svc.name}</span>
                              <span style={{ fontSize: 13, color: '#888' }}>{formatEur(svc.price)}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {products.length > 0 && (
                    <div>
                      <span style={labelStyle()}>Prodotti inclusi nell'offerta</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {products.map((prd) => {
                          const checked = selectedProductIds.includes(prd.id)
                          return (
                            <label key={prd.id} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 10, border: `1.5px solid ${checked ? '#222' : '#E9E9E9'}`, background: checked ? '#F5F5F5' : '#FFF', transition: 'all 120ms' }}>
                              <input type="checkbox" checked={checked} onChange={() => toggleSelection(prd.id, 'product')} style={{ width: 16, height: 16, accentColor: '#222' }} />
                              <span style={{ flex: 1, fontSize: 14, color: '#222' }}>{prd.name}</span>
                              <span style={{ fontSize: 13, color: '#888' }}>{formatEur(prd.price)}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Price preview */}
                  {pricePreview.length > 0 && (
                    <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '12px 16px' }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Anteprima prezzi</p>
                      {pricePreview.map((item) => (
                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, color: '#444' }}>{item.name}</span>
                          <span style={{ fontSize: 13 }}>
                            <span style={{ textDecoration: 'line-through', color: '#B0B0B0', marginRight: 6 }}>{formatEur(item.originalPrice)}</span>
                            <span style={{ fontWeight: 700, color: '#16A34A' }}>{formatEur(item.discountedPrice)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Targeting */}
          <div>
            <span style={labelStyle()}>Target</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['all', 'segment'] as TargetType[]).map((tt) => {
                  const active = targetType === tt
                  return (
                    <button
                      key={tt}
                      type="button"
                      onClick={() => setTargetType(tt)}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid',
                        borderColor: active ? '#222' : '#E5E5E5', background: active ? '#222' : '#FFF',
                        color: active ? '#FFF' : '#444', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      }}
                    >
                      {tt === 'all' ? 'Tutti i clienti' : 'Segmento specifico'}
                    </button>
                  )
                })}
              </div>

              {targetType === 'segment' && (
                <div style={{ position: 'relative' }}>
                  <select
                    style={{ ...inputStyle(), appearance: 'none', paddingRight: 36, cursor: 'pointer' }}
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value as TargetSegment)}
                  >
                    {(Object.entries(SEGMENT_LABELS) as [TargetSegment, string][]).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} color="#888" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                </div>
              )}

              {segmentCount !== null && (
                <p style={{ fontSize: 12, color: '#888', margin: 0 }}>
                  Stima clienti raggiunti: <strong style={{ color: '#222' }}>{segmentCount}</strong> con consenso marketing attivo
                </p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {fieldset(
              <>
                <label style={labelStyle()}>Inizia il *</label>
                <input type="datetime-local" style={inputStyle()} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </>
            )}
            {fieldset(
              <>
                <label style={labelStyle()}>Scade il *</label>
                <input type="datetime-local" style={inputStyle()} value={endsAt} onChange={(e) => setEndsAt(e.target.value)} min={startsAt} />
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4, paddingBottom: 8 }}>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('draft')}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5',
                background: '#FFF', color: '#222', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              Salva bozza
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSubmit('active')}
              className="styll-btn-primary"
              style={{ flex: 1, padding: '11px 16px', fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}
            >
              {saving ? 'Pubblicazione…' : 'Pubblica ora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
