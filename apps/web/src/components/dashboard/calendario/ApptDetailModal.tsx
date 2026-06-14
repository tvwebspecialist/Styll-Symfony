'use client'

import * as React from 'react'
import Link from 'next/link'
import { Package, Trash2, X, Users } from 'lucide-react'
import type { CalendarioAppointment } from '@/lib/actions/calendario'
import {
  updateAppointmentStatus,
  updateAppointmentStaff,
  getCalendarioFormOptions,
  updateAppointmentServices,
  getAppointmentProducts,
  addProductToAppointmentByStaff,
  removeAppointmentProduct,
  type AppointmentProductRow,
} from '@/lib/actions/calendario'
import { CustomSelect } from '@/components/ui/custom-select'
import {
  STATUS_LABELS,
  STATUS_BADGE,
  getCategoryColor,
  getInitials,
  formatTime,
  getDurationMin,
} from './calendario-utils'

interface FormOptions {
  clients:  Array<{ id: string; full_name: string | null }>
  staff:    Array<{ id: string; full_name: string | null }>
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number; color: string | null }>
  products: Array<{ id: string; name: string; brand: string | null; price_sell: number }>
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
}

export function ApptDetailModal({
  appt,
  onClose,
  onUpdated,
  tenantId,
  isManagerOrOwner = false,
}: {
  appt: CalendarioAppointment
  onClose: () => void
  onUpdated: () => void
  tenantId: string
  isManagerOrOwner?: boolean
}) {
  const [editing, setEditing]       = React.useState(false)
  const [editStatus, setEditStatus] = React.useState(appt.status)
  const [editNotes, setEditNotes]   = React.useState(appt.notes ?? '')
  const [editServiceId, setEditServiceId]   = React.useState<string>(appt.services[0]?.id ?? '')
  const [editStaffId, setEditStaffId]       = React.useState<string>(appt.staff_id)
  const [saving, setSaving]         = React.useState(false)
  const [saveError, setSaveError]   = React.useState<string | null>(null)
  const [options, setOptions]       = React.useState<FormOptions | null>(null)
  const [viewStatus, setViewStatus]     = React.useState(appt.status)
  const [quickSaving, setQuickSaving]   = React.useState(false)

  // Products state
  const [apptProducts, setApptProducts]     = React.useState<AppointmentProductRow[]>([])
  const [productsLoading, setProductsLoading] = React.useState(true)
  const [addProductId, setAddProductId]     = React.useState('')
  const [addProductQty, setAddProductQty]   = React.useState(1)
  const [productAdding, setProductAdding]   = React.useState(false)
  const [productError, setProductError]     = React.useState<string | null>(null)

  React.useEffect(() => {
    getCalendarioFormOptions(tenantId)
      .then((opts) => setOptions(opts))
      .catch(() => setOptions(null))
  }, [tenantId])

  React.useEffect(() => {
    getAppointmentProducts(appt.id, tenantId)
      .then((rows) => setApptProducts(rows))
      .catch(() => setApptProducts([]))
      .finally(() => setProductsLoading(false))
  }, [appt.id, tenantId])

  const sc  = STATUS_BADGE[viewStatus] ?? { bg: '#F3F4F6', text: '#374151' }
  const col = getCategoryColor(appt.services[0]?.category)
  const dateLabel = new Date(appt.start_time).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const isCompleted = viewStatus === 'completed'
  const productsEditable = !isCompleted

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const res = await updateAppointmentStatus(appt.id, editStatus, editNotes || null)
    if (!res.success) { setSaveError(res.error ?? 'Errore durante il salvataggio'); setSaving(false); return }
    const svcRes = await updateAppointmentServices(appt.id, editServiceId ? [editServiceId] : [], tenantId)
    if (!svcRes.success) { setSaving(false); setSaveError(svcRes.error ?? 'Errore nell\'aggiornamento servizi'); return }
    if (editStaffId && editStaffId !== appt.staff_id) {
      const staffRes = await updateAppointmentStaff(appt.id, editStaffId)
      if (!staffRes.success) { setSaving(false); setSaveError(staffRes.error ?? 'Errore aggiornamento staff'); return }
    }
    setSaving(false)
    onUpdated()
    onClose()
  }

  async function handleAddProduct() {
    if (!addProductId) return
    setProductAdding(true)
    setProductError(null)
    const res = await addProductToAppointmentByStaff({
      tenantId,
      appointmentId: appt.id,
      productId: addProductId,
      quantity: addProductQty,
    })
    if (!res.success && !res.alreadyExists) {
      setProductError(res.error ?? 'Errore')
      setProductAdding(false)
      return
    }
    // Reload products list
    const rows = await getAppointmentProducts(appt.id, tenantId)
    setApptProducts(rows)
    setAddProductId('')
    setAddProductQty(1)
    setProductAdding(false)
  }

  async function handleRemoveProduct(id: string) {
    await removeAppointmentProduct(id, tenantId)
    setApptProducts((prev) => prev.filter((p) => p.id !== id))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box',
  }

  const productsTotal = apptProducts.reduce((s, p) => s + p.price_at_sale * p.quantity, 0)

  return (
    <div
      className="styll-modal-overlay"
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        className="styll-modal-popup"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFF', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.15)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="styll-modal-drag-handle" aria-hidden="true" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: sc.bg, color: sc.text, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>
              {STATUS_LABELS[viewStatus] ?? viewStatus}
            </span>
            {appt.booking_source === 'walk_in' && <span style={{ fontSize: 12 }}>🚶 Walk-in</span>}
          </div>
          <button type="button" onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 100, border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} color="#374151" />
          </button>
        </div>

        {/* Client */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 100, background: col.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: col.text }}>
            {getInitials(appt.client_name)}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{appt.client_name}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#9CA3AF' }}>{dateLabel}</p>
          </div>
        </div>

        {/* Services */}
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 10 }}>
          {appt.services.length > 0 ? appt.services.map((s) => {
            const dotColor = s.color || '#888888'
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <div style={{ width: 8, height: 8, borderRadius: 100, background: dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500, flex: 1 }}>{s.name}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>{s.duration_minutes} min</span>
              </div>
            )
          }) : (
            <span style={{ fontSize: 13, color: '#9CA3AF' }}>Nessun servizio associato</span>
          )}
        </div>

        {/* Time */}
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: apptProducts.length > 0 && !productsLoading ? 8 : 16, fontSize: 13, color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</span>
          <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {getDurationMin(appt)}min</span>
          {appt.notes && !editing && <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {appt.notes}</span>}
        </div>

        {/* Product chips — quick-glance summary, shown only when products exist */}
        {!productsLoading && apptProducts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {apptProducts.map((p) => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 100,
                  background: '#FEF3C7',
                  border: '1px solid #FDE68A',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#92400E',
                  whiteSpace: 'nowrap',
                }}
              >
                <Package size={11} color="#D97706" />
                {p.product_name}{p.quantity > 1 ? ` ×${p.quantity}` : ''}
              </span>
            ))}
          </div>
        )}

        {/* ── Prodotti ──────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Package size={13} color="#9CA3AF" />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Prodotti
            </span>
            {apptProducts.length > 0 && (
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#374151' }}>
                {formatPrice(productsTotal)}
              </span>
            )}
          </div>

          <div style={{ background: '#F9FAFB', borderRadius: 12, overflow: 'hidden' }}>
            {productsLoading ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', padding: '10px 14px', margin: 0 }}>Caricamento…</p>
            ) : apptProducts.length === 0 && !productsEditable ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', padding: '10px 14px', margin: 0 }}>Nessun prodotto associato</p>
            ) : (
              <>
                {apptProducts.map((p) => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #F0F0F0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.product_name}
                      </p>
                      {p.product_brand && (
                        <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF' }}>{p.product_brand}</p>
                      )}
                    </div>
                    <span style={{ fontSize: 12, color: '#6B7280', flexShrink: 0 }}>×{p.quantity}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                      {formatPrice(p.price_at_sale * p.quantity)}
                    </span>
                    {productsEditable && (
                      <button
                        type="button"
                        onClick={() => void handleRemoveProduct(p.id)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                      >
                        <Trash2 size={12} color="#DC2626" />
                      </button>
                    )}
                  </div>
                ))}

                {/* Add product form — only when not completed */}
                {productsEditable && options && options.products.length > 0 && (
                  <div style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1 }}>
                        <CustomSelect
                          value={addProductId}
                          onChange={(v) => setAddProductId(v)}
                          options={options.products
                            .filter((p) => !apptProducts.some((ap) => ap.product_id === p.id))
                            .map((p) => ({
                              value: p.id,
                              label: p.brand ? `${p.name} — ${p.brand}` : p.name,
                            }))}
                          placeholder="Aggiungi prodotto…"
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F3F4F6', borderRadius: 8, padding: '0 8px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setAddProductQty((q) => Math.max(1, q - 1))}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#374151', padding: '0 2px', lineHeight: 1 }}
                        >−</button>
                        <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: 'center', color: '#111827' }}>{addProductQty}</span>
                        <button
                          type="button"
                          onClick={() => setAddProductQty((q) => q + 1)}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: '#374151', padding: '0 2px', lineHeight: 1 }}
                        >+</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleAddProduct()}
                        disabled={!addProductId || productAdding}
                        style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#111827', color: '#FFF', fontSize: 12, fontWeight: 600, cursor: !addProductId || productAdding ? 'not-allowed' : 'pointer', opacity: !addProductId || productAdding ? 0.5 : 1, flexShrink: 0 }}
                      >
                        {productAdding ? '…' : 'Aggiungi'}
                      </button>
                    </div>
                    {productError && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#DC2626' }}>{productError}</p>}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Edit form or action buttons */}
        {editing ? (
          <div>
            {options && options.services.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Servizio</label>
                <CustomSelect
                  value={editServiceId}
                  onChange={(v) => setEditServiceId(v)}
                  options={options.services.map((s) => ({ value: s.id, label: `${s.name} (${s.duration_minutes} min)` }))}
                  placeholder="Seleziona servizio…"
                />
              </div>
            )}
            {isManagerOrOwner && options && options.staff.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Staff</label>
                <CustomSelect
                  value={editStaffId}
                  onChange={(v) => setEditStaffId(v)}
                  options={options.staff.map((s) => ({ value: s.id, label: s.full_name ?? 'Staff' }))}
                  placeholder="Seleziona staff…"
                />
              </div>
            )}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Stato</label>
              <CustomSelect
                value={editStatus}
                onChange={(v) => setEditStatus(v)}
                options={Object.entries(STATUS_LABELS).map(([val, lbl]) => ({ value: val, label: lbl }))}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Note</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>
            {saveError && <p style={{ margin: '0 0 8px', fontSize: 12, color: '#dc2626' }}>{saveError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => { setEditing(false); setSaveError(null) }}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1px solid #E9E9E9', background: '#FFF', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Annulla
              </button>
              <button type="button" onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvataggio…' : 'Salva'}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Staff name — managers/owners only */}
            {isManagerOrOwner && options && (
              <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color="#9CA3AF" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>
                  {options.staff.find((s) => s.id === appt.staff_id)?.full_name ?? 'Staff'}
                </span>
              </div>
            )}
            {/* Quick status change */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#888', display: 'block', marginBottom: 6, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Stato</label>
              <CustomSelect
                value={viewStatus}
                onChange={(v) => {
                  setViewStatus(v)
                  setQuickSaving(true)
                  void updateAppointmentStatus(appt.id, v, appt.notes)
                    .then((res) => {
                      setQuickSaving(false)
                      if (res.success) onUpdated()
                    })
                    .catch((err) => {
                      console.error('[CalendarioClient] error:', err)
                      setQuickSaving(false)
                    })
                }}
                options={Object.entries(STATUS_LABELS).map(([val, lbl]) => ({ value: val, label: lbl }))}
              />
              {quickSaving && <span style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4, display: 'block' }}>Salvataggio…</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: viewStatus !== 'cancelled' ? 10 : 0 }}>
              <Link
                href={`/clienti/${appt.client_id}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0', borderRadius: 10, border: '1px solid #E9E9E9', background: '#FFF', fontSize: 13, fontWeight: 500, color: '#374151', textDecoration: 'none' }}
              >
                Vai al cliente
              </Link>
              <button type="button" onClick={() => setEditing(true)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: '#111827', color: '#FFF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Modifica
              </button>
            </div>
            {viewStatus !== 'cancelled' && (
              <button
                type="button"
                onClick={() => { setEditStatus('cancelled'); setEditing(true) }}
                style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: '1px solid #dc2626', background: '#FFF', color: '#dc2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Cancella appuntamento
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
