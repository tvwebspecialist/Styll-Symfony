'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Scissors,
  Package,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  EyeOff,
  Settings2,
  ImagePlus,
  ArrowRight,
} from 'lucide-react'
import { StyllModal } from '@/components/ui/styll-modal'
import { CustomSelect } from '@/components/ui/custom-select'
import { createClient } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type {
  ServizioRow,
  ProdottoRow,
  LocationRow,
  InventoryEntry,
  ServiceCategoryRow,
} from '@/lib/actions/catalogo'
import {
  upsertServizio,
  deleteServizio,
  reorderServizi,
  upsertProdotto,
  deleteProdotto,
  bulkUpdateCategory,
  deleteCategory,
} from '@/lib/actions/catalogo'

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        borderRadius: 999,
        border: 'none',
        background: checked ? '#1A1A1A' : '#E5E5E5',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background 150ms ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: '#FFFFFF',
          transition: 'left 150ms ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  )
}

// ─── Form field helpers ───────────────────────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-fg-secondary)',
        }}
      >
        {label}
        {required && <span style={{ color: 'var(--color-danger)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  )
}

// ─── Servizio Form ────────────────────────────────────────────────────────────

function ServizioForm({
  servizio,
  categories,
  categoryColors,
  onClose,
  onSaved,
}: {
  servizio: ServizioRow | null
  categories: string[]
  categoryColors: Map<string, string>
  onClose: () => void
  onSaved: (s: ServizioRow) => void
}) {
  const [name, setName] = React.useState(servizio?.name ?? '')
  const [description, setDescription] = React.useState(servizio?.description ?? '')
  const [price, setPrice] = React.useState(String(servizio?.price ?? ''))
  const [duration, setDuration] = React.useState(String(servizio?.duration_minutes ?? ''))
  const [category, setCategory] = React.useState(servizio?.category ?? '')
  const [isActive, setIsActive] = React.useState(servizio?.is_active ?? true)
  const [loading, setLoading] = React.useState(false)

  const isEdit = Boolean(servizio?.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Il nome è obbligatorio')
      return
    }
    setLoading(true)
    const inheritedColor = categoryColors.get(category.trim()) ?? null
    const result = await upsertServizio({
      id: servizio?.id,
      name: name.trim(),
      description: description.trim() || null,
      price: parseFloat(price) || 0,
      duration_minutes: parseInt(duration) || 0,
      category: category.trim() || null,
      color: inheritedColor,
      is_active: isActive,
    })
    setLoading(false)
    if (result.success) {
      toast.success(isEdit ? 'Servizio aggiornato' : 'Servizio creato')
      onSaved({
        id: servizio?.id ?? '',
        name: name.trim(),
        description: description.trim() || null,
        price: parseFloat(price) || 0,
        duration_minutes: parseInt(duration) || 0,
        category: category.trim() || null,
        color: inheritedColor,
        display_order: servizio?.display_order ?? 0,
        is_active: isActive,
      })
      onClose()
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Field label="Nome" required>
        <input
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Taglio uomo"
          required
        />
      </Field>

      <Field label="Descrizione">
        <textarea
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%', minHeight: 80, resize: 'vertical' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione opzionale…"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prezzo (€)">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Durata (min)">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            type="number"
            inputMode="numeric"
            step="5"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="30"
          />
        </Field>
      </div>

      <Field label="Categoria">
        <CustomSelect
          value={category}
          onChange={(v) => setCategory(v)}
          options={[
            { value: '', label: '— Nessuna categoria —' },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          placeholder="Seleziona categoria…"
        />
        {category && categoryColors.get(category) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: categoryColors.get(category),
                border: '1px solid rgba(0,0,0,0.1)',
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: 'var(--color-fg-muted)' }}>
              Colore categoria: {categoryColors.get(category)}
            </span>
          </div>
        )}
        {categories.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
            Nessuna categoria disponibile. Creane una con "Gestisci Categorie".
          </p>
        )}
      </Field>

      <Field label="Attivo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle checked={isActive} onChange={setIsActive} />
          <span style={{ fontSize: 14, color: 'var(--color-fg-secondary)' }}>
            {isActive ? 'Visibile ai clienti' : 'Nascosto'}
          </span>
        </div>
      </Field>

      {/* FIX 3: sticky footer so Save button is always accessible on mobile */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--color-border)',
          marginTop: 4,
          position: 'sticky',
          bottom: 0,
          background: '#fff',
          paddingBottom: 4,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="styll-btn-secondary"
          style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="styll-btn-primary"
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {isEdit ? 'Salva modifiche' : 'Crea servizio'}
        </button>
      </div>
    </form>
  )
}

// ─── Prodotto Form ────────────────────────────────────────────────────────────

function ProdottoForm({
  prodotto,
  categories,
  locations,
  existingInventory,
  onClose,
  onSaved,
  onDelete,
}: {
  prodotto: ProdottoRow | null
  categories: string[]
  locations: LocationRow[]
  existingInventory: InventoryEntry[]
  onClose: () => void
  onSaved: () => void
  onDelete?: () => void
}) {
  const [name, setName] = React.useState(prodotto?.name ?? '')
  const [brand, setBrand] = React.useState(prodotto?.brand ?? '')
  const [description, setDescription] = React.useState(prodotto?.description ?? '')
  const [priceSell, setPriceSell] = React.useState(String(prodotto?.price_sell ?? ''))
  const [priceCost, setPriceCost] = React.useState(String(prodotto?.price_cost ?? ''))
  const [category, setCategory] = React.useState(prodotto?.category ?? '')
  const [sku, setSku] = React.useState(prodotto?.sku ?? '')
  const [photoUrl, setPhotoUrl] = React.useState(prodotto?.photo_url ?? '')
  const [photoUploading, setPhotoUploading] = React.useState(false)
  const [isActive, setIsActive] = React.useState(prodotto?.is_active ?? true)
  const [inventory, setInventory] = React.useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const loc of locations) {
      const found = existingInventory.find((e) => e.location_id === loc.id)
      init[loc.id] = found?.quantity ?? 0
    }
    return init
  })
  const [loading, setLoading] = React.useState(false)

  const isEdit = Boolean(prodotto?.id)

  const margin = React.useMemo(() => {
    const sell = parseFloat(priceSell)
    const cost = parseFloat(priceCost)
    if (!sell || !cost || sell <= 0) return null
    return Math.round(((sell - cost) / sell) * 100)
  }, [priceSell, priceCost])

  async function handlePhotoUpload(file: File) {
    setPhotoUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('products').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('products').getPublicUrl(path)
      setPhotoUrl(urlData.publicUrl)
      toast.success('Immagine caricata')
    } catch (err: unknown) {
      toast.error('Errore upload: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setPhotoUploading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Il nome è obbligatorio')
      return
    }
    setLoading(true)
    const inventoryEntries: InventoryEntry[] = locations.map((loc) => ({
      location_id: loc.id,
      quantity: inventory[loc.id] ?? 0,
    }))
    const result = await upsertProdotto(
      {
        id: prodotto?.id,
        name: name.trim(),
        brand: brand.trim() || null,
        description: description.trim() || null,
        price_sell: parseFloat(priceSell) || 0,
        price_cost: parseFloat(priceCost) || null,
        category: category.trim() || null,
        sku: sku.trim() || null,
        is_active: isActive,
        photo_url: photoUrl || null,
      },
      inventoryEntries
    )
    setLoading(false)
    if (result.success) {
      toast.success(isEdit ? 'Prodotto aggiornato' : 'Prodotto creato')
      onSaved()
      onClose()
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Photo upload */}
      <Field label="Foto prodotto">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 72, height: 72, borderRadius: 12,
              border: '2px dashed var(--color-border)',
              background: 'var(--color-bg-secondary)',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--color-fg-muted)',
            }}
          >
            {photoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <ImagePlus size={24} />
            }
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '9px 16px',
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-fg)',
                cursor: photoUploading ? 'not-allowed' : 'pointer',
                opacity: photoUploading ? 0.6 : 1, minHeight: 38,
              }}
            >
              {photoUploading
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <ImagePlus size={14} />}
              {photoUploading ? 'Caricamento…' : 'Carica immagine'}
              <input
                type="file" accept="image/*" style={{ display: 'none' }}
                disabled={photoUploading}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }}
              />
            </label>
            {photoUrl && (
              <button type="button" onClick={() => setPhotoUrl('')}
                style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--color-fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Rimuovi foto
              </button>
            )}
          </div>
        </div>
      </Field>

      <Field label="Nome" required>
        <input
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Shampoo professionale"
          required
        />
      </Field>

      <Field label="Brand / Marca">
        <input
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Es. Wella, American Crew, Davines…"
          autoCapitalize="words"
        />
      </Field>

      <Field label="Descrizione">
        <textarea
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%', minHeight: 80, resize: 'vertical' }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descrizione opzionale…"
        />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Prezzo vendita (€)" required>
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={priceSell}
            onChange={(e) => setPriceSell(e.target.value)}
            placeholder="0.00"
            required
          />
        </Field>
        <Field label="Prezzo costo (€)">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={priceCost}
            onChange={(e) => setPriceCost(e.target.value)}
            placeholder="0.00"
          />
        </Field>
      </div>

      {margin !== null && (
        <div
          style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 13,
            color: '#16A34A',
            fontWeight: 500,
          }}
        >
          Margine stimato: {margin}%
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Categoria">
          <>
            <input
              className="styll-input"
              style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
              list="prodotto-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Es. Shampoo, Cera…"
            />
            <datalist id="prodotto-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </>
        </Field>
        <Field label="Codice SKU">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU-001"
          />
        </Field>
      </div>

      <Field label="Attivo">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Toggle checked={isActive} onChange={setIsActive} />
          <span style={{ fontSize: 14, color: 'var(--color-fg-secondary)' }}>
            {isActive ? 'In vendita' : 'Non disponibile'}
          </span>
        </div>
      </Field>

      {locations.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-fg-secondary)',
              margin: '0 0 12px',
            }}
          >
            Stock per sede
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {locations.map((loc) => (
              <div
                key={loc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 14px',
                  background: 'var(--color-bg-secondary)',
                  borderRadius: 10,
                  border: '1px solid var(--color-border)',
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-fg)' }}>
                  {loc.name}
                </span>
                <input
                  className="styll-input"
                  style={{ width: 80, padding: '6px 10px', fontSize: 15, textAlign: 'center' }}
                  type="number"
                  min="0"
                  value={inventory[loc.id] ?? 0}
                  onChange={(e) =>
                    setInventory((prev) => ({
                      ...prev,
                      [loc.id]: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FIX 3: sticky footer so Save button is always accessible on mobile */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--color-border)',
          marginTop: 4,
          position: 'sticky',
          bottom: 0,
          background: '#fff',
          paddingBottom: 4,
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="styll-btn-secondary"
          style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}
        >
          Annulla
        </button>
        <button
          type="submit"
          disabled={loading}
          className="styll-btn-primary"
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {isEdit ? 'Salva modifiche' : 'Crea prodotto'}
        </button>
      </div>

      {/* Destructive delete — edit mode only */}
      {isEdit && onDelete && (
        <div style={{ paddingTop: 12, borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => {
              if (confirm('Eliminare questo prodotto? L\'azione è irreversibile.')) {
                onDelete()
                onClose()
              }
            }}
            style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', opacity: 0.8 }}
          >
            Elimina prodotto
          </button>
        </div>
      )}
    </form>
  )
}

// ─── Sortable service row ─────────────────────────────────────────────────────

function SortableServizioRow({
  servizio,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  servizio: ServizioRow
  onEdit: (s: ServizioRow) => void
  onDelete: (id: string) => void
  onToggleActive: (id: string, value: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: servizio.id,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : servizio.is_active ? 1 : 0.5,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="styll-card"
      data-dragging={isDragging}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
        }}
      >
        {/* Drag handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          style={{
            cursor: 'grab',
            color: 'var(--color-fg-muted)',
            background: 'none',
            border: 'none',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            touchAction: 'none',
          }}
        >
          <GripVertical size={16} />
        </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {/* Category color dot */}
              {servizio.color && (
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    background: servizio.color,
                    flexShrink: 0,
                    display: 'inline-block',
                    border: '1.5px solid rgba(0,0,0,0.08)',
                  }}
                />
              )}
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-fg)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {servizio.name}
              </span>
              {servizio.duration_minutes > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--color-fg-secondary)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 999,
                    padding: '2px 8px',
                    flexShrink: 0,
                  }}
                >
                  {servizio.duration_minutes} min
                </span>
              )}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--color-fg)',
                  background: 'var(--color-bg-tertiary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 999,
                  padding: '2px 8px',
                  flexShrink: 0,
                }}
              >
                €{servizio.price.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
              </span>
              {!servizio.is_active && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 500,
                    color: 'var(--color-fg-muted)',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 999,
                    padding: '2px 7px',
                    flexShrink: 0,
                  }}
                >
                  <EyeOff size={10} />
                  Disattivato
                </span>
              )}
            </div>
            {servizio.description && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-fg-muted)',
                  margin: '2px 0 0',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {servizio.description}
              </p>
            )}
          </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <Toggle
            checked={servizio.is_active}
            onChange={(v) => onToggleActive(servizio.id, v)}
          />
          <button
            type="button"
            onClick={() => onEdit(servizio)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-fg-secondary)',
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(servizio.id)}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-danger)',
            }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Prodotto Card (Nike Premium) ────────────────────────────────────────────

function ProdottoCard({
  prodotto,
  onEdit,
}: {
  prodotto: ProdottoRow
  onEdit: (p: ProdottoRow) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onEdit(prodotto)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEdit(prodotto) }}
      className={[
        'group relative bg-white rounded-2xl cursor-pointer',
        'shadow-[0_4px_20px_rgba(0,0,0,0.08)]',
        'transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-[0_8px_28px_rgba(0,0,0,0.12)]',
        !prodotto.is_active ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* ── Image zone — small inset (2, independent from text padding 4) ── */}
      <div className="relative h-[220px] mx-2 mt-2 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
        {prodotto.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prodotto.photo_url}
            alt={prodotto.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Package size={44} strokeWidth={1.2} />
          </div>
        )}

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

        {/* Top-left: badge (solid red for stock basso, dark for inactive) */}
        {!prodotto.is_active ? (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 px-2.5 py-1 rounded-full">
            Inattivo
          </span>
        ) : prodotto.lowStock ? (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider text-white bg-red-500 px-2.5 py-1 rounded-full">
            Stock basso
          </span>
        ) : null}
      </div>

      {/* ── Info zone ── */}
      <div className="px-4 pt-3 pb-4">
        <p className="text-[17px] font-bold text-gray-900 truncate leading-snug">{prodotto.name}</p>
        {prodotto.brand && (
          <p className="text-sm text-gray-400 font-normal mt-0.5 truncate">{prodotto.brand}</p>
        )}
        {prodotto.description ? (
          <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
            {prodotto.description}
          </p>
        ) : prodotto.sku ? (
          <p className="text-xs text-gray-300 mt-1.5 font-mono tracking-tight">{prodotto.sku}</p>
        ) : null}

        {/* Footer row */}
        <div className="flex items-center justify-between mt-3 gap-2">
          {/* Price pill */}
          <span className="text-sm font-bold text-gray-900 bg-[#f0f0f0] rounded-full px-4 py-1.5 shrink-0">
            €{prodotto.price_sell.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
          </span>

          {/* Arrow circle — arrow rotates ↗ on card hover */}
          <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
            <ArrowRight
              size={14}
              className="text-white transition-transform duration-200 group-hover:-rotate-45"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Category Color Palette ───────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#EF4444', // rosso
  '#F97316', // arancione
  '#F59E0B', // ambra
  '#EAB308', // giallo
  '#84CC16', // verde lime
  '#22C55E', // verde
  '#10B981', // smeraldo
  '#14B8A6', // teal
  '#06B6D4', // ciano
  '#3B82F6', // blu
  '#6366F1', // indaco
  '#8B5CF6', // viola
  '#A855F7', // porpora
  '#EC4899', // rosa
  '#F43F5E', // rosa-rosso
  '#78716C', // grigio-caldo
  '#64748B', // grigio-ardesia
  '#000000', // nero
]

function ColorPalette({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          title={c}
          onClick={() => onChange(c)}
          style={{
            width: 32, height: 32, borderRadius: 8, background: c, flexShrink: 0,
            border: value === c ? '2.5px solid #111' : '2.5px solid transparent',
            outline: value === c ? '2.5px solid rgba(0,0,0,0.18)' : 'none',
            outlineOffset: 2,
            cursor: 'pointer',
            transition: 'transform 100ms, outline 100ms, box-shadow 100ms',
            transform: value === c ? 'scale(1.18)' : 'scale(1)',
            boxShadow: value === c ? '0 2px 8px rgba(0,0,0,0.18)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

// ─── Category Manager Modal ───────────────────────────────────────────────────

function CategoryManagerModal({
  dbCategories,
  categoryColorMap,
  onClose,
  onSaved,
  onCreated,
  onDeleted,
}: {
  dbCategories: ServiceCategoryRow[]
  categoryColorMap: Map<string, string>
  onClose: () => void
  onSaved: (oldName: string, newName: string, color: string | null) => void
  onCreated: (cat: ServiceCategoryRow) => void
  onDeleted: (name: string) => void
}) {
  const [rows, setRows] = React.useState<{ original: string; name: string; color: string; isNew?: boolean; _paletteOpen?: boolean }[]>(() =>
    dbCategories.map((c) => ({
      original: c.name,
      name:     c.name,
      color:    c.color ?? categoryColorMap.get(c.name) ?? '',
    }))
  )
  const [saving,   setSaving]   = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [newName,  setNewName]  = React.useState('')
  const [newColor, setNewColor] = React.useState('#6366F1')

  async function handleSave(idx: number) {
    const row = rows[idx]
    if (row.isNew) {
      // New category: no server action needed — it will persist when a service uses it
      toast.success(`Categoria "${row.name}" pronta. Assegnala ad un servizio per renderla permanente.`)
      onCreated({ name: row.name, color: row.color || null })
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, original: row.name, isNew: false } : r)))
      return
    }
    setSaving(row.original)
    const result = await bulkUpdateCategory(row.original, row.name, row.color || null)
    setSaving(null)
    if (result.success) {
      toast.success(`Categoria "${row.name}" aggiornata`)
      onSaved(row.original, row.name, row.color || null)
      setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, original: row.name } : r)))
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  async function handleDelete(idx: number) {
    const row = rows[idx]
    // New/unsaved categories can be removed immediately from local state
    if (row.isNew) {
      setRows((prev) => prev.filter((_, i) => i !== idx))
      return
    }
    setDeleting(row.original)
    const result = await deleteCategory(row.original)
    setDeleting(null)
    if (result.success) {
      toast.success(`Categoria "${row.original}" eliminata`)
      onDeleted(row.original)
      setRows((prev) => prev.filter((_, i) => i !== idx))
    } else if (result.serviceCount && result.serviceCount > 0) {
      toast.error(`Non puoi eliminare: ${result.serviceCount} servizi usano questa categoria`)
    } else {
      toast.error(result.error ?? 'Errore durante l\'eliminazione')
    }
  }

  function handleAddNew() {
    if (!newName.trim()) { toast.error('Inserisci un nome per la categoria'); return }
    const trimmed = newName.trim()
    if (rows.some((r) => r.name === trimmed)) { toast.error('Categoria già esistente'); return }
    setRows((prev) => [...prev, { original: trimmed, name: trimmed, color: newColor, isNew: true }])
    onCreated({ name: trimmed, color: newColor })
    setNewName('')
    setNewColor('#6366F1')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Categorie esistenti ── */}
      {rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {rows.map((row, idx) => (
            <div
              key={row.original}
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: `1.5px solid ${row._paletteOpen ? (row.color || '#6366F1') : 'var(--color-border)'}`,
                transition: 'border-color 150ms',
                background: '#fff',
              }}
            >
              {/* Row header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {/* Left color accent + swatch button */}
                <button
                  type="button"
                  title="Cambia colore"
                  onClick={() => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, _paletteOpen: !r._paletteOpen } : r)))}
                  style={{
                    width: 52, alignSelf: 'stretch', flexShrink: 0,
                    background: row.color || '#E5E7EB',
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'filter 120ms',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.9)' }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
                  </svg>
                </button>

                {/* Name input */}
                <input
                  className="styll-input"
                  style={{
                    flex: 1, border: 'none', borderRadius: 0,
                    padding: '14px 14px', fontSize: 15, fontWeight: 600,
                    background: 'transparent', outline: 'none',
                    color: '#111',
                  }}
                  value={row.name}
                  onChange={(e) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))}
                  onFocus={(e) => { (e.currentTarget as HTMLElement).style.background = '#FAFAFA' }}
                  onBlur={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                />

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 10 }}>
                  {!row.isNew && (
                    <button
                      type="button"
                      disabled={saving === row.original}
                      onClick={() => handleSave(idx)}
                      style={{
                        height: 34, padding: '0 14px', borderRadius: 8, flexShrink: 0,
                        border: 'none', background: '#111', color: '#fff',
                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                        opacity: saving === row.original ? 0.6 : 1,
                        fontFamily: 'inherit',
                      }}
                    >
                      {saving === row.original && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                      Salva
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={deleting === row.original}
                    onClick={() => handleDelete(idx)}
                    title="Elimina"
                    style={{
                      width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                      border: 'none', background: 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'background 120ms',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#FEF2F2' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {deleting === row.original
                      ? <Loader2 size={14} color="#EF4444" style={{ animation: 'spin 1s linear infinite' }} />
                      : <Trash2 size={14} color="#EF4444" />}
                  </button>
                </div>
              </div>

              {/* Palette (expands below) */}
              {row._paletteOpen && (
                <div style={{ padding: '12px 14px 14px', borderTop: '1px solid var(--color-border)', background: '#FAFAFA' }}>
                  <ColorPalette
                    value={row.color}
                    onChange={(c) => setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, color: c, _paletteOpen: false } : r)))}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 && (
        <p style={{ fontSize: 14, color: '#B0B0B0', textAlign: 'center', padding: '8px 0 20px', margin: 0 }}>
          Nessuna categoria ancora. Creane una qui sotto.
        </p>
      )}

      {/* ── Aggiungi nuova categoria ── */}
      <div
        style={{
          borderRadius: 16,
          border: '1.5px solid #E0E7FF',
          background: '#F5F7FF',
          overflow: 'hidden',
          marginBottom: 16,
        }}
      >
        {/* Header label */}
        <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 20, height: 20, borderRadius: 6, background: newColor, flexShrink: 0, border: '2px solid rgba(0,0,0,0.08)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Nuova categoria
          </span>
        </div>

        {/* Name input */}
        <div style={{ padding: '10px 16px' }}>
          <input
            className="styll-input"
            placeholder="Es. Taglio, Colore, Trattamenti…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddNew() }}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '12px 14px', fontSize: 15, fontWeight: 500,
              borderRadius: 10, border: '1.5px solid #C7D2FE',
              background: '#fff', outline: 'none',
            }}
          />
        </div>

        {/* Palette */}
        <div style={{ padding: '4px 16px 12px' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Colore
          </p>
          <ColorPalette value={newColor} onChange={setNewColor} />
        </div>

        {/* Add button */}
        <div style={{ padding: '0 16px 16px' }}>
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={handleAddNew}
            style={{
              width: '100%', height: 44, borderRadius: 10,
              border: 'none', cursor: 'pointer',
              background: newName.trim() ? '#111' : '#E5E7EB',
              color: newName.trim() ? '#fff' : '#9CA3AF',
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: 'inherit',
              transition: 'background 150ms, color 150ms',
            }}
          >
            <Plus size={15} />
            Aggiungi categoria
          </button>
        </div>
      </div>

      {/* ── Chiudi ── */}
      <button
        type="button"
        onClick={onClose}
        className="styll-btn-secondary"
        style={{ width: '100%', padding: '13px 16px', fontSize: 14, minHeight: 44, borderRadius: 12 }}
      >
        Chiudi
      </button>
    </div>
  )
}

// ─── Main CatalogoClient ──────────────────────────────────────────────────────

export function CatalogoClient({
  servizi: initialServizi,
  prodotti: initialProdotti,
  locations,
  dbCategories: initialDbCategories,
  inventoryByProduct,
}: {
  servizi: ServizioRow[]
  prodotti: ProdottoRow[]
  locations: LocationRow[]
  dbCategories: ServiceCategoryRow[]
  inventoryByProduct: Record<string, InventoryEntry[]>
}) {
  const [activeTab, setActiveTab] = React.useState<'servizi' | 'prodotti'>('servizi')

  // Servizi state
  const [servizi, setServizi] = React.useState<ServizioRow[]>(initialServizi)
  const [serviziSheet, setServiziSheet] = React.useState(false)
  const [editingServizio, setEditingServizio] = React.useState<ServizioRow | null>(null)
  const [categoryManagerOpen, setCategoryManagerOpen] = React.useState(false)
  const [dbCategories, setDbCategories] = React.useState<ServiceCategoryRow[]>(initialDbCategories)

  // Prodotti state
  const [prodotti, setProdotti] = React.useState<ProdottoRow[]>(initialProdotti)
  const [prodottiSheet, setProdottiSheet] = React.useState(false)
  const [editingProdotto, setEditingProdotto] = React.useState<ProdottoRow | null>(null)

  // Keep local state in sync with server-provided props on re-render
  React.useEffect(() => { setServizi(initialServizi) }, [initialServizi])
  React.useEffect(() => { setProdotti(initialProdotti) }, [initialProdotti])
  React.useEffect(() => { setDbCategories(initialDbCategories) }, [initialDbCategories])

  // DnD sensors (pointer only — no touch issues)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  // ── Service categories (merge DB categories + service-derived categories)
  const serviceCategories = React.useMemo(() => {
    const cats = new Set<string>(dbCategories.map((c) => c.name))
    for (const s of servizi) { if (s.category) cats.add(s.category) }
    return Array.from(cats).sort()
  }, [servizi, dbCategories])

  // ── Category → color map (DB color takes priority)
  const categoryColorMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of servizi) {
      if (s.category && s.color && !map.has(s.category)) {
        map.set(s.category, s.color)
      }
    }
    for (const c of dbCategories) {
      if (c.color) map.set(c.name, c.color)
    }
    return map
  }, [servizi, dbCategories])

  // ── Services grouped by category
  const groupedServizi = React.useMemo(() => {
    const groups = new Map<string, ServizioRow[]>()
    for (const s of servizi) {
      const key = s.category ?? 'Senza categoria'
      const arr = groups.get(key) ?? []
      arr.push(s)
      groups.set(key, arr)
    }
    return groups
  }, [servizi])

  // ── Product categories
  const productCategories = React.useMemo(() => {
    const cats = new Set(prodotti.map((p) => p.category).filter((c): c is string => Boolean(c)))
    return Array.from(cats).sort()
  }, [prodotti])

  // ── Existing inventory for editing product (per-location from DB)
  const existingInventory = React.useMemo<InventoryEntry[]>(() => {
    if (!editingProdotto) return []
    const productInv = inventoryByProduct[editingProdotto.id] ?? []
    return locations.map((loc) => {
      const found = productInv.find((e) => e.location_id === loc.id)
      return { location_id: loc.id, quantity: found?.quantity ?? 0 }
    })
  }, [editingProdotto, locations, inventoryByProduct])

  // ── Drag end handler
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = servizi.findIndex((s) => s.id === active.id)
    const newIndex = servizi.findIndex((s) => s.id === over.id)
    const reordered = arrayMove(servizi, oldIndex, newIndex)
    setServizi(reordered)
    await reorderServizi(reordered.map((s) => s.id))
  }

  // ── Toggle servizio active (optimistic)
  async function handleToggleServizioActive(id: string, value: boolean) {
    setServizi((prev) => prev.map((s) => (s.id === id ? { ...s, is_active: value } : s)))
    const s = servizi.find((sv) => sv.id === id)
    if (!s) return
    const result = await upsertServizio({ ...s, id, is_active: value })
    if (!result.success) {
      setServizi((prev) => prev.map((sv) => (sv.id === id ? { ...sv, is_active: !value } : sv)))
      toast.error(result.error ?? 'Errore')
    }
  }

  // ── Delete servizio
  async function handleDeleteServizio(id: string) {
    if (!confirm('Eliminare questo servizio?')) return
    const result = await deleteServizio(id)
    if (result.success) {
      setServizi((prev) => prev.filter((s) => s.id !== id))
      toast.success('Servizio eliminato')
    } else {
      toast.error(result.error ?? 'Errore')
    }
  }

  // ── Delete prodotto
  async function handleDeleteProdotto(id: string) {
    if (!confirm('Eliminare questo prodotto?')) return
    const result = await deleteProdotto(id)
    if (result.success) {
      setProdotti((prev) => prev.filter((p) => p.id !== id))
      toast.success('Prodotto eliminato')
    } else {
      toast.error(result.error ?? 'Errore')
    }
  }

  // ── Servizio saved callback
  function handleServizioSaved(saved: ServizioRow) {
    if (saved.id) {
      setServizi((prev) => {
        const idx = prev.findIndex((s) => s.id === saved.id)
        if (idx === -1) return [...prev, saved]
        const next = [...prev]
        next[idx] = saved
        return next
      })
    } else {
      // New item: will be refreshed by server revalidation
    }
  }

  // ── Category manager saved callback (optimistic update)
  function handleCategoryManagerSaved(oldName: string, newName: string, color: string | null) {
    setServizi((prev) =>
      prev.map((s) =>
        s.category === oldName
          ? { ...s, category: newName, color: color }
          : s
      )
    )
    setDbCategories((prev) =>
      prev.map((c) => c.name === oldName ? { ...c, name: newName, color } : c)
    )
  }

  function handleCategoryCreated(cat: ServiceCategoryRow) {
    setDbCategories((prev) => prev.some((c) => c.name === cat.name) ? prev : [...prev, cat])
  }

  function handleCategoryDeleted(name: string) {
    setDbCategories((prev) => prev.filter((c) => c.name !== name))
    // Clear category from services that used it
    setServizi((prev) =>
      prev.map((s) => s.category === name ? { ...s, category: null } : s)
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Keyframes for spinner */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            className="dashboard-page-title"
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--color-fg)',
              margin: 0,
            }}
          >
            Catalogo
          </h1>
          <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
            Gestisci i tuoi servizi e prodotti
          </p>
        </div>

        {/* Add button + category manager */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {activeTab === 'servizi' && (
            <button
              type="button"
              onClick={() => setCategoryManagerOpen(true)}
              className="styll-btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 16px',
                fontSize: 14,
                minHeight: 44,
              }}
            >
              <Settings2 size={15} />
              Gestisci Categorie
            </button>
          )}
          {activeTab === 'servizi' ? (
          <button
            type="button"
            onClick={() => { setEditingServizio(null); setServiziSheet(true) }}
            className="styll-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 18px',
              fontSize: 14,
              minHeight: 44,
            }}
          >
            <Plus size={16} />
            Nuovo servizio
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { setEditingProdotto(null); setProdottiSheet(true) }}
            className="styll-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 18px',
              fontSize: 14,
              minHeight: 44,
            }}
          >
            <Plus size={16} />
            Nuovo prodotto
          </button>
        )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'inline-flex',
          gap: 4,
          marginBottom: 28,
          alignSelf: 'flex-start',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('servizi')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 18px',
            borderRadius: 999,
            border: activeTab === 'servizi' ? '1px solid #1A1A1A' : '1px solid #E9E9E9',
            background: activeTab === 'servizi' ? '#1A1A1A' : '#FFFFFF',
            color: activeTab === 'servizi' ? '#FFFFFF' : 'var(--color-fg-secondary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
            minHeight: 40,
          }}
        >
          <Scissors size={15} />
          Servizi
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: activeTab === 'servizi' ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
              color: activeTab === 'servizi' ? '#FFFFFF' : 'var(--color-fg-secondary)',
              borderRadius: 999,
              padding: '1px 7px',
            }}
          >
            {servizi.length}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('prodotti')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            padding: '8px 18px',
            borderRadius: 999,
            border: activeTab === 'prodotti' ? '1px solid #1A1A1A' : '1px solid #E9E9E9',
            background: activeTab === 'prodotti' ? '#1A1A1A' : '#FFFFFF',
            color: activeTab === 'prodotti' ? '#FFFFFF' : 'var(--color-fg-secondary)',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
            minHeight: 40,
          }}
        >
          <Package size={15} />
          Prodotti
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: activeTab === 'prodotti' ? 'rgba(255,255,255,0.2)' : 'var(--color-border)',
              color: activeTab === 'prodotti' ? '#FFFFFF' : 'var(--color-fg-secondary)',
              borderRadius: 999,
              padding: '1px 7px',
            }}
          >
            {prodotti.length}
          </span>
        </button>
      </div>

      {/* ── Tab: Servizi ── */}
      {activeTab === 'servizi' && (
        <div className="tab-content">
          {servizi.length === 0 ? (
            <EmptyState
              icon={<Scissors size={32} />}
              title="Nessun servizio"
              description="Crea il tuo primo servizio per iniziare a ricevere prenotazioni."
              cta="Aggiungi il primo servizio"
              onCta={() => { setEditingServizio(null); setServiziSheet(true) }}
            />
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={servizi.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {Array.from(groupedServizi.entries()).map(([cat, items]) => (
                    <div key={cat}>
                      <div
                        style={{
                          borderLeft: items[0]?.color ? `3px solid ${items[0].color}` : '3px solid transparent',
                          paddingLeft: 12,
                        }}
                      >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          margin: '0 0 10px 0',
                        }}
                      >
                        <p
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'var(--color-fg-muted)',
                            margin: 0,
                          }}
                        >
                          {cat}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map((s) => (
                          <SortableServizioRow
                            key={s.id}
                            servizio={s}
                            onEdit={(sv) => { setEditingServizio(sv); setServiziSheet(true) }}
                            onDelete={handleDeleteServizio}
                            onToggleActive={handleToggleServizioActive}
                          />
                        ))}
                      </div>
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      )}

      {/* ── Tab: Prodotti ── */}
      {activeTab === 'prodotti' && (
        <div className="tab-content">
          {prodotti.length === 0 ? (
            <EmptyState
              icon={<Package size={32} />}
              title="Nessun prodotto"
              description="Aggiungi prodotti al tuo catalogo per venderli ai clienti."
              cta="Aggiungi il primo prodotto"
              onCta={() => { setEditingProdotto(null); setProdottiSheet(true) }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {prodotti.map((p) => (
                <ProdottoCard
                  key={p.id}
                  prodotto={p}
                  onEdit={(pr) => { setEditingProdotto(pr); setProdottiSheet(true) }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Servizio modal ── */}
      <StyllModal
        open={serviziSheet}
        onClose={() => setServiziSheet(false)}
        title={editingServizio ? 'Modifica servizio' : 'Nuovo servizio'}
      >
        <ServizioForm
          servizio={editingServizio}
          categories={serviceCategories}
          categoryColors={categoryColorMap}
          onClose={() => setServiziSheet(false)}
          onSaved={handleServizioSaved}
        />
      </StyllModal>

      {/* ── Prodotto modal ── */}
      <StyllModal
        open={prodottiSheet}
        onClose={() => setProdottiSheet(false)}
        title={editingProdotto ? 'Modifica prodotto' : 'Nuovo prodotto'}
      >
        <ProdottoForm
          prodotto={editingProdotto}
          categories={productCategories}
          locations={locations}
          existingInventory={existingInventory}
          onClose={() => setProdottiSheet(false)}
          onSaved={() => {
            // Optimistic: nothing to do; server revalidation will update data
          }}
          onDelete={editingProdotto ? () => {
            handleDeleteProdotto(editingProdotto.id)
            setProdottiSheet(false)
          } : undefined}
        />
      </StyllModal>

      {/* ── Category manager modal ── */}
      <StyllModal
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        title="Gestisci Categorie"
        description="Modifica il nome e il colore di ogni categoria. Le modifiche si applicano a tutti i servizi in quella categoria."
        size="md"
      >
        <CategoryManagerModal
          dbCategories={dbCategories}
          categoryColorMap={categoryColorMap}
          onClose={() => setCategoryManagerOpen(false)}
          onSaved={handleCategoryManagerSaved}
          onCreated={handleCategoryCreated}
          onDeleted={handleCategoryDeleted}
        />
      </StyllModal>
    </div>
  )
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  description,
  cta,
  onCta,
}: {
  icon: React.ReactNode
  title: string
  description: string
  cta: string
  onCta: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '64px 24px',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-fg-muted)',
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>
          {title}
        </p>
        <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '6px 0 0', maxWidth: 320 }}>
          {description}
        </p>
      </div>
      <button
        type="button"
        onClick={onCta}
        className="styll-btn-primary"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '11px 20px',
          fontSize: 14,
          minHeight: 44,
          marginTop: 4,
        }}
      >
        <Plus size={16} />
        {cta}
      </button>
    </div>
  )
}
