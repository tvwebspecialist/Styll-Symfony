'use client'

import * as React from 'react'
import { X, ChevronDown } from 'lucide-react'
import {
  createOfferta,
  getCatalogoPerOfferta,
  type DiscountType,
  type PromotionStatus,
  type CatalogoItem,
  type PromotionServiceDiscountInput,
  type PromotionProductDiscountInput,
} from '@/lib/actions/offers'
import { applyBestPromotion } from '@/lib/utils/offer-pricing'

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

interface ServiceDiscount {
  serviceId: string
  discount_type: DiscountType
  discount_value: string
}

interface ProductDiscount {
  productId: string
  discount_type: DiscountType
  discount_value: string
}

interface Props {
  tenantId: string
  onSuccess: () => void
  onClose: () => void
}

export function OfferForm({ tenantId, onSuccess, onClose }: Props) {
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [validFrom, setValidFrom] = React.useState(() => {
    const d = new Date(); d.setMinutes(0, 0, 0); return d.toISOString().slice(0, 16)
  })
  const [validUntil, setValidUntil] = React.useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); d.setHours(23, 59, 0, 0)
    return d.toISOString().slice(0, 16)
  })
  const [noExpiry, setNoExpiry] = React.useState(false)
  const [showInApp, setShowInApp] = React.useState(true)
  const [showOnLanding, setShowOnLanding] = React.useState(false)

  const [serviceDiscounts, setServiceDiscounts] = React.useState<ServiceDiscount[]>([])
  const [productDiscounts, setProductDiscounts] = React.useState<ProductDiscount[]>([])

  const [catalogo, setCatalogo] = React.useState<CatalogoItem[] | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getCatalogoPerOfferta(tenantId).then(setCatalogo)
  }, [tenantId])

  const services = catalogo?.filter((i) => i.type === 'service') ?? []
  const products = catalogo?.filter((i) => i.type === 'product') ?? []

  function toggleService(svc: CatalogoItem) {
    setServiceDiscounts((prev) => {
      if (prev.find((s) => s.serviceId === svc.id)) return prev.filter((s) => s.serviceId !== svc.id)
      return [...prev, { serviceId: svc.id, discount_type: 'percent', discount_value: '' }]
    })
  }

  function toggleProduct(prd: CatalogoItem) {
    setProductDiscounts((prev) => {
      if (prev.find((p) => p.productId === prd.id)) return prev.filter((p) => p.productId !== prd.id)
      return [...prev, { productId: prd.id, discount_type: 'percent', discount_value: '' }]
    })
  }

  function updateServiceDiscount(serviceId: string, field: 'discount_type' | 'discount_value', value: string) {
    setServiceDiscounts((prev) => prev.map((s) => s.serviceId === serviceId ? { ...s, [field]: value } : s))
  }

  function updateProductDiscount(productId: string, field: 'discount_type' | 'discount_value', value: string) {
    setProductDiscounts((prev) => prev.map((p) => p.productId === productId ? { ...p, [field]: value } : p))
  }

  const pricePreview = React.useMemo(() => {
    return serviceDiscounts
      .map((sd) => {
        const item = catalogo?.find((c) => c.id === sd.serviceId)
        if (!item) return null
        const val = parseFloat(sd.discount_value)
        if (isNaN(val) || val <= 0) return null
        const { discountedPrice } = applyBestPromotion(item.price, [{
          promotionId: 'preview', promotionTitle: '', discount_type: sd.discount_type, discount_value: val, valid_from: '',
        }])
        return { name: item.name, originalPrice: item.price, discountedPrice }
      })
      .filter(Boolean) as { name: string; originalPrice: number; discountedPrice: number }[]
  }, [catalogo, serviceDiscounts])

  async function handleSubmit(status: PromotionStatus) {
    setError(null)
    if (!title.trim()) { setError("Inserisci un titolo per la promozione."); return }
    if (serviceDiscounts.length === 0 && productDiscounts.length === 0) {
      setError("Seleziona almeno un servizio o prodotto."); return
    }
    for (const sd of serviceDiscounts) {
      const val = parseFloat(sd.discount_value)
      if (isNaN(val) || val <= 0) { setError("Inserisci uno sconto valido per tutti i servizi selezionati."); return }
      if (sd.discount_type === 'percent' && val > 100) { setError("La percentuale non può superare 100%."); return }
    }
    for (const pd of productDiscounts) {
      const val = parseFloat(pd.discount_value)
      if (isNaN(val) || val <= 0) { setError("Inserisci uno sconto valido per tutti i prodotti selezionati."); return }
      if (pd.discount_type === 'percent' && val > 100) { setError("La percentuale non può superare 100%."); return }
    }
    if (!noExpiry && new Date(validUntil) <= new Date(validFrom)) {
      setError("La data di fine deve essere successiva alla data di inizio."); return
    }

    setSaving(true)
    try {
      const result = await createOfferta({
        tenantId,
        title: title.trim(),
        description: description.trim() || undefined,
        valid_from: new Date(validFrom).toISOString(),
        valid_until: noExpiry ? null : new Date(validUntil).toISOString(),
        show_in_app: showInApp,
        show_on_landing: showOnLanding,
        status,
        service_discounts: serviceDiscounts.map((sd): PromotionServiceDiscountInput => ({
          serviceId: sd.serviceId,
          discount_type: sd.discount_type,
          discount_value: parseFloat(sd.discount_value),
        })),
        product_discounts: productDiscounts.map((pd): PromotionProductDiscountInput => ({
          productId: pd.productId,
          discount_type: pd.discount_type,
          discount_value: parseFloat(pd.discount_value),
        })),
      })
      if (!result.success) { setError(result.error ?? 'Errore durante il salvataggio.'); return }
      onSuccess()
    } catch {
      setError('Errore imprevisto. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    width: 40, height: 22, borderRadius: 11, background: active ? '#222' : '#D0D0D0',
    position: 'relative', cursor: 'pointer', border: 'none', transition: 'background 150ms', flexShrink: 0,
  })
  const thumbStyle = (active: boolean): React.CSSProperties => ({
    position: 'absolute', top: 2, left: active ? 20 : 2, width: 18, height: 18,
    borderRadius: 9, background: '#FFF', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  })

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#222', margin: 0 }}>Nuova promozione</h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={20} color="#888" />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle()}>Titolo *</label>
            <input style={inputStyle()} placeholder='Es. "Sconto estate sui tagli"' value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={labelStyle()}>Descrizione <span style={{ color: '#B0B0B0' }}>(facoltativa)</span></label>
            <textarea style={{ ...inputStyle(), resize: 'vertical', minHeight: 64 }} placeholder="Dettagli visibili ai clienti nella PWA…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>

          {/* Services with per-row discounts */}
          {catalogo === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[0, 1, 2].map((i) => <div key={i} style={{ height: 44, background: '#F4F4F4', borderRadius: 10 }} />)}
            </div>
          ) : (
            <>
              {services.length > 0 && (
                <div>
                  <span style={labelStyle()}>Servizi con sconto</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {services.map((svc) => {
                      const sd = serviceDiscounts.find((s) => s.serviceId === svc.id)
                      const checked = !!sd
                      return (
                        <div key={svc.id} style={{ borderRadius: 12, border: `1.5px solid ${checked ? '#222' : '#E9E9E9'}`, overflow: 'hidden', transition: 'border-color 120ms' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: checked ? '#F5F5F5' : '#FFF' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleService(svc)} style={{ width: 16, height: 16, accentColor: '#222', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, color: '#222' }}>{svc.name}</span>
                            <span style={{ fontSize: 13, color: '#888' }}>{formatEur(svc.price)}</span>
                          </label>
                          {checked && sd && (
                            <div style={{ padding: '8px 12px 12px', background: '#FAFAFA', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{ position: 'relative', flex: '0 0 150px' }}>
                                <select style={{ ...inputStyle(), appearance: 'none', paddingRight: 28, fontSize: 13 }} value={sd.discount_type} onChange={(e) => updateServiceDiscount(svc.id, 'discount_type', e.target.value)}>
                                  <option value="percent">Percentuale (%)</option>
                                  <option value="fixed">Importo fisso (€)</option>
                                </select>
                                <ChevronDown size={13} color="#888" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                              </div>
                              <input type="number" min="0" max={sd.discount_type === 'percent' ? '100' : undefined} step="0.01" style={{ ...inputStyle(), flex: 1, fontSize: 13 }} placeholder={sd.discount_type === 'percent' ? 'Es. 20' : 'Es. 5'} value={sd.discount_value} onChange={(e) => updateServiceDiscount(svc.id, 'discount_value', e.target.value)} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#555', flexShrink: 0 }}>{sd.discount_type === 'percent' ? '%' : '€'}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {products.length > 0 && (
                <div>
                  <span style={labelStyle()}>Prodotti con sconto</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {products.map((prd) => {
                      const pd = productDiscounts.find((p) => p.productId === prd.id)
                      const checked = !!pd
                      return (
                        <div key={prd.id} style={{ borderRadius: 12, border: `1.5px solid ${checked ? '#222' : '#E9E9E9'}`, overflow: 'hidden', transition: 'border-color 120ms' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: checked ? '#F5F5F5' : '#FFF' }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleProduct(prd)} style={{ width: 16, height: 16, accentColor: '#222', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, color: '#222' }}>{prd.name}</span>
                            <span style={{ fontSize: 13, color: '#888' }}>{formatEur(prd.price)}</span>
                          </label>
                          {checked && pd && (
                            <div style={{ padding: '8px 12px 12px', background: '#FAFAFA', borderTop: '1px solid #F0F0F0', display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{ position: 'relative', flex: '0 0 150px' }}>
                                <select style={{ ...inputStyle(), appearance: 'none', paddingRight: 28, fontSize: 13 }} value={pd.discount_type} onChange={(e) => updateProductDiscount(prd.id, 'discount_type', e.target.value)}>
                                  <option value="percent">Percentuale (%)</option>
                                  <option value="fixed">Importo fisso (€)</option>
                                </select>
                                <ChevronDown size={13} color="#888" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                              </div>
                              <input type="number" min="0" max={pd.discount_type === 'percent' ? '100' : undefined} step="0.01" style={{ ...inputStyle(), flex: 1, fontSize: 13 }} placeholder={pd.discount_type === 'percent' ? 'Es. 20' : 'Es. 5'} value={pd.discount_value} onChange={(e) => updateProductDiscount(prd.id, 'discount_value', e.target.value)} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#555', flexShrink: 0 }}>{pd.discount_type === 'percent' ? '%' : '€'}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {pricePreview.length > 0 && (
                <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '12px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Anteprima prezzi scontati</p>
                  {pricePreview.map((item) => (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: '#444' }}>{item.name}</span>
                      <span>
                        <span style={{ textDecoration: 'line-through', color: '#B0B0B0', marginRight: 6, fontSize: 13 }}>{formatEur(item.originalPrice)}</span>
                        <span style={{ fontWeight: 700, color: '#16A34A', fontSize: 13 }}>{formatEur(item.discountedPrice)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Dates */}
          <div>
            <span style={labelStyle()}>Periodo di validità</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ ...labelStyle(), fontSize: 11 }}>Inizia il *</label>
                <input type="datetime-local" style={inputStyle()} value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ ...labelStyle(), fontSize: 11 }}>Scade il</label>
                <input type="datetime-local" style={inputStyle(noExpiry)} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} min={validFrom} disabled={noExpiry} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#555' }}>
              <input type="checkbox" checked={noExpiry} onChange={(e) => setNoExpiry(e.target.checked)} style={{ accentColor: '#222' }} />
              Nessuna scadenza
            </label>
          </div>

          {/* Visibility toggles */}
          <div>
            <span style={labelStyle()}>Visibilità</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'App clienti (PWA)', desc: 'Sezione "Offerte per te" con sconto al booking', value: showInApp, set: setShowInApp },
                { label: 'Landing page', desc: 'Pagina pubblica del salone', value: showOnLanding, set: setShowOnLanding },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222' }}>{item.label}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#B0B0B0' }}>{item.desc}</p>
                  </div>
                  <button type="button" onClick={() => item.set((v) => !v)} style={toggleStyle(item.value)}>
                    <span style={thumbStyle(item.value)} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#B91C1C' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, paddingTop: 4, paddingBottom: 8 }}>
            <button type="button" disabled={saving} onClick={() => handleSubmit('draft')} style={{ flex: 1, padding: '11px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5', background: '#FFF', color: '#222', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
              Salva bozza
            </button>
            <button type="button" disabled={saving} onClick={() => handleSubmit('active')} className="styll-btn-primary" style={{ flex: 1, padding: '11px 16px', fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Salvataggio…' : 'Pubblica ora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
