'use client'

import * as React from 'react'
import Link from 'next/link'
import { X, Users } from 'lucide-react'
import type { CalendarioAppointment } from '@/lib/actions/calendario'
import {
  updateAppointmentStatus,
  updateAppointmentStaff,
  getCalendarioFormOptions,
  updateAppointmentServices,
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

  React.useEffect(() => {
    getCalendarioFormOptions(tenantId)
      .then((opts) => setOptions(opts))
      .catch(() => setOptions(null))
  }, [tenantId])

  const sc  = STATUS_BADGE[viewStatus] ?? { bg: '#F3F4F6', text: '#374151' }
  const col = getCategoryColor(appt.services[0]?.category)
  const dateLabel = new Date(appt.start_time).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

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

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #E5E7EB',
    fontSize: 13, color: '#111827', background: '#FFF', outline: 'none', boxSizing: 'border-box',
  }

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
        <div style={{ background: '#F9FAFB', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#374151' }}>
          <span style={{ fontWeight: 600 }}>{formatTime(appt.start_time)} – {formatTime(appt.end_time)}</span>
          <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {getDurationMin(appt)}min</span>
          {appt.notes && !editing && <span style={{ color: '#9CA3AF', marginLeft: 8 }}>· {appt.notes}</span>}
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
