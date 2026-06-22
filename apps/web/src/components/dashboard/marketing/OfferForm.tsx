'use client'

import * as React from 'react'
import { X, Check, ChevronLeft, ImagePlus, Trash2 } from 'lucide-react'
import {
  createOfferta,
  updateOfferta,
  getCatalogoPerOfferta,
  uploadPromozioneCopertina,
  type DiscountType,
  type PromotionStatus,
  type CatalogoItem,
  type PromotionRow,
} from '@/lib/actions/offers'
import { applyBestPromotion } from '@/lib/utils/offer-pricing'
import { DatePicker } from '@/components/ui/date-picker'
import { CustomSelect } from '@/components/ui/custom-select'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatEur(val: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val)
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function combineDateTime(date: string, hh: string, mm: string): string {
  return new Date(`${date}T${hh}:${mm}`).toISOString()
}

function parseISOParts(iso: string): { date: string; hh: string; mm: string } {
  const d = new Date(iso)
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
    hh: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
  }
}

function fmtDatetime(date: string, hh: string, mm: string): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(`${date}T${hh}:${mm}`))
}

// ── types ─────────────────────────────────────────────────────────────────────

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

// ── styled checkbox ───────────────────────────────────────────────────────────
// stopPropagation prevents double-fire when checkbox is inside a clickable row

function StyledCheckbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange() }}
      style={{
        width: 18, height: 18, borderRadius: 5,
        border: `1.5px solid ${checked ? '#222' : '#C8C8C8'}`,
        background: checked ? '#222' : '#FFF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: 'pointer',
        transition: 'background 120ms, border-color 120ms',
      }}
    >
      {checked && <Check size={11} color="#FFF" strokeWidth={3} />}
    </button>
  )
}

// ── toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 11,
        background: value ? '#222' : '#D0D0D0',
        position: 'relative', cursor: 'pointer', border: 'none',
        transition: 'background 150ms', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18,
        borderRadius: 9, background: '#FFF', transition: 'left 150ms',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ── select options ────────────────────────────────────────────────────────────

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: String(i).padStart(2, '0'),
  label: String(i).padStart(2, '0'),
}))
const MIN_OPTIONS = ['00', '15', '30', '45'].map((m) => ({ value: m, label: m }))
const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percent', label: 'Percentuale (%)' },
  { value: 'fixed',   label: 'Importo fisso (€)' },
]

// ── shared style tokens ───────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid #E5E5E5', fontSize: 14, color: '#222',
  background: '#FFFFFF', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block',
}

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase',
  letterSpacing: '0.05em', margin: '8px 0 6px',
}

// ── step config ───────────────────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Dettagli' },
  { n: 2, label: 'Servizi' },
  { n: 3, label: 'Prodotti' },
  { n: 4, label: 'Validità' },
  { n: 5, label: 'Riepilogo' },
]

// ── props ─────────────────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  onSuccess: () => void
  onClose: () => void
  initialData?: PromotionRow
}

// ── component ─────────────────────────────────────────────────────────────────

export function OfferForm({ tenantId, onSuccess, onClose, initialData }: Props) {
  const [step, setStep] = React.useState(1)

  // Step 1
  const [title, setTitle] = React.useState(() => initialData?.title ?? '')
  const [description, setDescription] = React.useState(() => initialData?.description ?? '')
  const [coverFile, setCoverFile] = React.useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = React.useState<string | null>(null)
  const [existingCoverUrl, setExistingCoverUrl] = React.useState<string | null>(() => initialData?.cover_image_url ?? null)
  const coverInputRef = React.useRef<HTMLInputElement>(null)

  // Step 2 & 3
  const [serviceDiscounts, setServiceDiscounts] = React.useState<ServiceDiscount[]>(() =>
    initialData?.service_items.map((si) => ({
      serviceId: si.serviceId,
      discount_type: si.discount_type,
      discount_value: String(si.discount_value),
    })) ?? [],
  )
  const [productDiscounts, setProductDiscounts] = React.useState<ProductDiscount[]>(() =>
    initialData?.product_items.map((pi) => ({
      productId: pi.productId,
      discount_type: pi.discount_type,
      discount_value: String(pi.discount_value),
    })) ?? [],
  )

  // Step 4
  const [validFromDate, setValidFromDate] = React.useState(() =>
    initialData?.valid_from ? parseISOParts(initialData.valid_from).date : todayStr(),
  )
  const [validFromHH, setValidFromHH] = React.useState(() =>
    initialData?.valid_from ? parseISOParts(initialData.valid_from).hh : '09',
  )
  const [validFromMM, setValidFromMM] = React.useState(() =>
    initialData?.valid_from ? parseISOParts(initialData.valid_from).mm : '00',
  )
  const [noExpiry, setNoExpiry] = React.useState(() => !!initialData && initialData.valid_until === null)
  const [validUntilDate, setValidUntilDate] = React.useState(() =>
    initialData?.valid_until ? parseISOParts(initialData.valid_until).date : daysFromNow(30),
  )
  const [validUntilHH, setValidUntilHH] = React.useState(() =>
    initialData?.valid_until ? parseISOParts(initialData.valid_until).hh : '23',
  )
  const [validUntilMM, setValidUntilMM] = React.useState(() =>
    initialData?.valid_until ? parseISOParts(initialData.valid_until).mm : '00',
  )

  // Shared
  const [catalogo, setCatalogo] = React.useState<CatalogoItem[] | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    getCatalogoPerOfferta(tenantId).then(setCatalogo)
  }, [tenantId])

  // Cleanup object URL on unmount
  React.useEffect(() => {
    const url = coverPreviewUrl
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [coverPreviewUrl])

  const services = catalogo?.filter((i) => i.type === 'service') ?? []
  const products = catalogo?.filter((i) => i.type === 'product') ?? []

  // ── cover image ────────────────────────────────────────────────────────────

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Formato non supportato (JPG, PNG, WebP)')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File troppo grande (max 5MB)')
      return
    }
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverFile(file)
    setCoverPreviewUrl(URL.createObjectURL(file))
    setError(null)
    // reset input so same file can be re-selected after removal
    e.target.value = ''
  }

  function handleRemoveCover() {
    if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl)
    setCoverFile(null)
    setCoverPreviewUrl(null)
    setExistingCoverUrl(null)
  }

  // ── catalog selection ──────────────────────────────────────────────────────

  function toggleService(svc: CatalogoItem) {
    setServiceDiscounts((prev) =>
      prev.find((s) => s.serviceId === svc.id)
        ? prev.filter((s) => s.serviceId !== svc.id)
        : [...prev, { serviceId: svc.id, discount_type: 'percent', discount_value: '' }]
    )
  }

  function toggleProduct(prd: CatalogoItem) {
    setProductDiscounts((prev) =>
      prev.find((p) => p.productId === prd.id)
        ? prev.filter((p) => p.productId !== prd.id)
        : [...prev, { productId: prd.id, discount_type: 'percent', discount_value: '' }]
    )
  }

  function updateServiceDiscount(id: string, field: 'discount_type' | 'discount_value', value: string) {
    setServiceDiscounts((prev) => prev.map((s) => s.serviceId === id ? { ...s, [field]: value } : s))
  }

  function updateProductDiscount(id: string, field: 'discount_type' | 'discount_value', value: string) {
    setProductDiscounts((prev) => prev.map((p) => p.productId === id ? { ...p, [field]: value } : p))
  }

  // ── price preview ──────────────────────────────────────────────────────────

  function calcPreview(price: number, dtype: DiscountType, dvalue: string): string | null {
    const val = parseFloat(dvalue)
    if (isNaN(val) || val <= 0) return null
    const { discountedPrice } = applyBestPromotion(price, [{
      promotionId: 'preview', promotionTitle: '', discount_type: dtype, discount_value: val, valid_from: '',
    }])
    return dtype === 'percent'
      ? `${formatEur(price)} → ${formatEur(discountedPrice)} (-${val}%)`
      : `${formatEur(price)} → ${formatEur(discountedPrice)} (-€${val})`
  }

  // ── step validation ────────────────────────────────────────────────────────

  function validateStep(): string | null {
    if (step === 1 && !title.trim()) return 'Il titolo è obbligatorio.'
    if (step === 2) {
      for (const sd of serviceDiscounts) {
        const v = parseFloat(sd.discount_value)
        if (isNaN(v) || v <= 0) return 'Inserisci uno sconto valido per ogni servizio selezionato.'
        if (sd.discount_type === 'percent' && v > 100) return 'La percentuale non può superare 100%.'
      }
    }
    if (step === 3) {
      for (const pd of productDiscounts) {
        const v = parseFloat(pd.discount_value)
        if (isNaN(v) || v <= 0) return 'Inserisci uno sconto valido per ogni prodotto selezionato.'
        if (pd.discount_type === 'percent' && v > 100) return 'La percentuale non può superare 100%.'
      }
    }
    if (step === 4) {
      if (!validFromDate) return 'La data di inizio è obbligatoria.'
      if (!noExpiry && validUntilDate) {
        const from  = new Date(`${validFromDate}T${validFromHH}:${validFromMM}`).getTime()
        const until = new Date(`${validUntilDate}T${validUntilHH}:${validUntilMM}`).getTime()
        if (until <= from) return 'La data di fine deve essere successiva alla data di inizio.'
      }
    }
    return null
  }

  function goNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    setError(null)
    setStep((s) => Math.min(s + 1, 5))
  }

  function goBack() {
    setError(null)
    setStep((s) => Math.max(s - 1, 1))
  }

  // ── submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit(status: PromotionStatus) {
    setError(null)
    setSaving(true)
    try {
      // If a new file was selected, upload it; otherwise keep existing URL
      let coverImageUrl: string | null = existingCoverUrl
      if (coverFile) {
        try {
          const fd = new FormData()
          fd.append('file', coverFile)
          const res = await uploadPromozioneCopertina(fd)
          if (res.ok && res.url) coverImageUrl = res.url
        } catch {
          // fall through — keep existing or null
        }
      }

      const input = {
        tenantId,
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image_url: coverImageUrl,
        valid_from: combineDateTime(validFromDate, validFromHH, validFromMM),
        valid_until: noExpiry ? null : combineDateTime(validUntilDate, validUntilHH, validUntilMM),
        show_in_app: true,
        show_on_landing: false,
        status,
        service_discounts: serviceDiscounts.map((sd) => ({
          serviceId: sd.serviceId,
          discount_type: sd.discount_type,
          discount_value: parseFloat(sd.discount_value),
        })),
        product_discounts: productDiscounts.map((pd) => ({
          productId: pd.productId,
          discount_type: pd.discount_type,
          discount_value: parseFloat(pd.discount_value),
        })),
      }

      const result = initialData
        ? await updateOfferta(initialData.id, input)
        : await createOfferta(input)

      if (!result.success) { setError((result as { error?: string }).error ?? 'Errore durante il salvataggio.'); return }
      onSuccess()
    } catch {
      setError('Errore imprevisto. Riprova.')
    } finally {
      setSaving(false)
    }
  }

  // ── step 1: dettagli ───────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={labelStyle}>
            Titolo *
            <span style={{ float: 'right', fontWeight: 400, color: '#B0B0B0' }}>{title.length}/60</span>
          </label>
          <input
            style={inputStyle}
            placeholder='Es. "Sconto estate sui tagli"'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
          />
        </div>
        <div>
          <label style={labelStyle}>
            Descrizione <span style={{ color: '#B0B0B0', fontWeight: 400 }}>(facoltativa)</span>
            <span style={{ float: 'right', fontWeight: 400, color: '#B0B0B0' }}>{description.length}/200</span>
          </label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 72 } as React.CSSProperties}
            placeholder="Dettagli visibili ai clienti…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
          />
        </div>

        {/* Cover image upload */}
        <div>
          <span style={labelStyle}>Foto di copertina <span style={{ color: '#B0B0B0', fontWeight: 400 }}>(facoltativa)</span></span>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
            onChange={handleCoverChange}
          />
          {!(coverPreviewUrl ?? existingCoverUrl) ? (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              style={{
                width: '100%', padding: '24px 16px', borderRadius: 12,
                border: '1.5px dashed #D4D4D4', background: '#FAFAFA',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, color: '#888',
                transition: 'border-color 150ms, background 150ms',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#B0B0B0'
                ;(e.currentTarget as HTMLElement).style.background = '#F5F5F5'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLElement).style.borderColor = '#D4D4D4'
                ;(e.currentTarget as HTMLElement).style.background = '#FAFAFA'
              }}
            >
              <ImagePlus size={24} color="#B0B0B0" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>Carica foto</span>
              <span style={{ fontSize: 11, color: '#C0C0C0' }}>JPG, PNG, WebP — max 5MB</span>
            </button>
          ) : (
            <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(coverPreviewUrl ?? existingCoverUrl)!}
                alt="Anteprima copertina"
                style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
              />
              <button
                type="button"
                onClick={handleRemoveCover}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  width: 32, height: 32, borderRadius: 8,
                  background: 'rgba(0,0,0,0.55)', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={15} color="#FFF" />
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── step 2 & 3: catalog item list ──────────────────────────────────────────

  function renderCatalogStep(
    items: CatalogoItem[],
    getDiscount: (id: string) => { discount_type: DiscountType; discount_value: string } | undefined,
    onToggle: (item: CatalogoItem) => void,
    onUpdate: (id: string, field: 'discount_type' | 'discount_value', value: string) => void,
    selectedCount: number,
    hint: string,
  ) {
    if (catalogo === null) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1, 2].map((i) => <div key={i} style={{ height: 44, background: '#F4F4F4', borderRadius: 10 }} />)}
        </div>
      )
    }
    if (items.length === 0) {
      return <p style={{ fontSize: 13, color: '#B0B0B0', textAlign: 'center', padding: '32px 0' }}>Nessun elemento nel catalogo.</p>
    }

    const groups = new Map<string, CatalogoItem[]>()
    for (const item of items) {
      const key = item.category || ''
      const arr = groups.get(key) ?? []
      arr.push(item)
      groups.set(key, arr)
    }
    const isFlat = groups.size === 1

    function renderRow(item: CatalogoItem) {
      const d = getDiscount(item.id)
      const checked = !!d
      const preview = d ? calcPreview(item.price, d.discount_type, d.discount_value) : null
      return (
        <div key={item.id} style={{
          borderRadius: 12, border: `1.5px solid ${checked ? '#222' : '#E9E9E9'}`,
          overflow: 'hidden', transition: 'border-color 120ms',
        }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer', background: checked ? '#F5F5F5' : '#FFF' }}
            onClick={() => onToggle(item)}
          >
            <StyledCheckbox checked={checked} onChange={() => onToggle(item)} />
            <span style={{ flex: 1, fontSize: 14, color: '#222' }}>{item.name}</span>
            <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>{formatEur(item.price)}</span>
          </div>
          {checked && d && (
            <div style={{ padding: '8px 12px 12px', background: '#FAFAFA', borderTop: '1px solid #F0F0F0' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ flex: '0 0 160px' }}>
                  <CustomSelect
                    compact
                    value={d.discount_type}
                    onChange={(v) => onUpdate(item.id, 'discount_type', v)}
                    options={DISCOUNT_TYPE_OPTIONS}
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  max={d.discount_type === 'percent' ? '100' : undefined}
                  step="0.01"
                  style={{ ...inputStyle, flex: 1, fontSize: 13, padding: '6px 10px' }}
                  placeholder={d.discount_type === 'percent' ? 'Es. 20' : 'Es. 5'}
                  value={d.discount_value}
                  onChange={(e) => onUpdate(item.id, 'discount_value', e.target.value)}
                />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#555', flexShrink: 0 }}>
                  {d.discount_type === 'percent' ? '%' : '€'}
                </span>
              </div>
              {preview && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#16A34A', fontWeight: 600 }}>{preview}</p>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isFlat ? (
          items.map(renderRow)
        ) : (
          Array.from(groups.entries()).map(([cat, list]) => (
            <div key={cat || '__none__'}>
              <p style={sectionHeadStyle}>{cat || 'Altro'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {list.map(renderRow)}
              </div>
            </div>
          ))
        )}
        {selectedCount === 0 && (
          <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 4 }}>{hint}</p>
        )}
      </div>
    )
  }

  function renderStep2() {
    return renderCatalogStep(
      services,
      (id) => { const s = serviceDiscounts.find((x) => x.serviceId === id); return s ? { discount_type: s.discount_type, discount_value: s.discount_value } : undefined },
      toggleService,
      updateServiceDiscount,
      serviceDiscounts.length,
      "Puoi saltare questo step se l'offerta non include servizi.",
    )
  }

  function renderStep3() {
    return renderCatalogStep(
      products,
      (id) => { const p = productDiscounts.find((x) => x.productId === id); return p ? { discount_type: p.discount_type, discount_value: p.discount_value } : undefined },
      toggleProduct,
      updateProductDiscount,
      productDiscounts.length,
      "Puoi saltare questo step se l'offerta non include prodotti.",
    )
  }

  // ── step 4: validità ───────────────────────────────────────────────────────
  // Date picker and time selects are vertically stacked to avoid height mismatch

  function renderDateTimeRow(
    dateVal: string, onDateChange: (v: string) => void,
    hh: string, onHH: (v: string) => void,
    mm: string, onMM: (v: string) => void,
  ) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <DatePicker value={dateVal} onChange={onDateChange} placeholder="Seleziona data" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#888', flexShrink: 0 }}>alle</span>
          <CustomSelect compact value={hh} onChange={onHH} options={HOUR_OPTIONS} />
          <span style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>:</span>
          <CustomSelect compact value={mm} onChange={onMM} options={MIN_OPTIONS} />
        </div>
      </div>
    )
  }

  function renderStep4() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <label style={labelStyle}>Inizia il *</label>
          {renderDateTimeRow(validFromDate, setValidFromDate, validFromHH, setValidFromHH, validFromMM, setValidFromMM)}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StyledCheckbox checked={noExpiry} onChange={() => setNoExpiry((v) => !v)} />
          <span
            style={{ fontSize: 13, color: '#555', cursor: 'pointer', userSelect: 'none' }}
            onClick={() => setNoExpiry((v) => !v)}
          >
            Nessuna scadenza
          </span>
        </div>

        {!noExpiry && (
          <div>
            <label style={labelStyle}>Scade il</label>
            {renderDateTimeRow(validUntilDate, setValidUntilDate, validUntilHH, setValidUntilHH, validUntilMM, setValidUntilMM)}
          </div>
        )}
      </div>
    )
  }

  // ── step 5: riepilogo ──────────────────────────────────────────────────────

  function renderStep5() {
    const hasDiscounts = serviceDiscounts.length > 0 || productDiscounts.length > 0
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Cover */}
        {(coverPreviewUrl ?? existingCoverUrl) && (
          <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #E5E5E5' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(coverPreviewUrl ?? existingCoverUrl)!} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Dettagli */}
        <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ ...sectionHeadStyle, margin: '0 0 6px' }}>Dettagli</p>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#222' }}>{title}</p>
          {description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{description}</p>}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 10, background: '#F0F9FF', color: '#0369A1', borderRadius: 100, padding: '2px 8px', fontWeight: 600 }}>PWA</span>
          </div>
        </div>

        {/* Servizi */}
        {serviceDiscounts.length > 0 && (
          <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ ...sectionHeadStyle, margin: '0 0 8px' }}>Servizi</p>
            {serviceDiscounts.map((sd) => {
              const svc = catalogo?.find((c) => c.id === sd.serviceId)
              if (!svc) return null
              return (
                <div key={sd.serviceId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#444' }}>{svc.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
                    {calcPreview(svc.price, sd.discount_type, sd.discount_value) ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Prodotti */}
        {productDiscounts.length > 0 && (
          <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '14px 16px' }}>
            <p style={{ ...sectionHeadStyle, margin: '0 0 8px' }}>Prodotti</p>
            {productDiscounts.map((pd) => {
              const prd = catalogo?.find((c) => c.id === pd.productId)
              if (!prd) return null
              return (
                <div key={pd.productId} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#444' }}>{prd.name}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#16A34A' }}>
                    {calcPreview(prd.price, pd.discount_type, pd.discount_value) ?? '—'}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {!hasDiscounts && (
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#9A3412' }}>
            Questa offerta non applica sconti automatici — sarà solo informativa.
          </div>
        )}

        {/* Validità */}
        <div style={{ background: '#F9F9F9', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ ...sectionHeadStyle, margin: '0 0 8px' }}>Validità</p>
          <p style={{ margin: 0, fontSize: 13, color: '#444' }}>Dal {fmtDatetime(validFromDate, validFromHH, validFromMM)}</p>
          {noExpiry
            ? <p style={{ margin: '4px 0 0', fontSize: 13, color: '#B0B0B0' }}>Nessuna scadenza</p>
            : validUntilDate && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#444' }}>Al {fmtDatetime(validUntilDate, validUntilHH, validUntilMM)}</p>
          }
        </div>
      </div>
    )
  }

  // ── step indicator ─────────────────────────────────────────────────────────

  function renderStepIndicator() {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', padding: '16px 24px 0', overflowX: 'auto' }}>
        {STEPS.map((s, i) => {
          const isActive = s.n === step
          const isDone   = s.n < step
          return (
            <React.Fragment key={s.n}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: isActive ? 'var(--color-primary, #222)' : isDone ? '#E5E5E5' : '#F4F4F4',
                  color: isActive ? 'var(--color-primary-fg, #FFF)' : isDone ? '#555' : '#B0B0B0',
                  transition: 'background 200ms',
                }}>
                  {isDone ? <Check size={13} strokeWidth={3} /> : s.n}
                </div>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 500, color: isActive ? '#222' : '#B0B0B0', whiteSpace: 'nowrap' }}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div style={{ flex: 1, height: 1, background: '#E5E5E5', margin: '14px 4px 0' }} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const stepContent: Record<number, () => React.ReactNode> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 560,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.16)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexShrink: 0 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#222', margin: 0 }}>{initialData ? 'Modifica promozione' : 'Nuova promozione'}</h2>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
            <X size={20} color="#888" />
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ flexShrink: 0 }}>
          {renderStepIndicator()}
        </div>

        {/* Step content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {stepContent[step]?.()}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#B91C1C', marginTop: 16 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div style={{
          padding: '12px 24px 20px', borderTop: '1px solid #F0F0F0',
          display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
        }}>
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              style={{
                padding: '11px 12px', borderRadius: 12, border: 'none', background: 'none',
                color: '#555', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 2,
              }}
            >
              <ChevronLeft size={16} />
              Indietro
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 5 ? (
            <button
              type="button"
              onClick={goNext}
              className="styll-btn-primary"
              style={{ padding: '11px 28px', fontSize: 14, cursor: 'pointer' }}
            >
              Avanti
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmit('draft')}
                style={{
                  padding: '11px 16px', borderRadius: 12, border: '1.5px solid #E5E5E5',
                  background: '#FFF', color: '#222', fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                Salva bozza
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmit('active')}
                className="styll-btn-primary"
                style={{ padding: '11px 20px', fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                {saving ? 'Salvataggio…' : 'Pubblica'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
