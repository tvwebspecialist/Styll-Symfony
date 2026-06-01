'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import {
  createAppointment,
  getCalendarioFormOptions,
  getStaffLocations,
  getStaffIdsWithLocations,
} from '@/lib/actions/calendario'
import { CustomSelect } from '@/components/ui/custom-select'
import { DatePicker } from '@/components/ui/date-picker'
import { localDatetimeToUtc } from '@/lib/utils/timezone'
import { TIME_SLOT_OPTIONS } from './calendario-utils'

interface FormOptions {
  clients:  Array<{ id: string; full_name: string | null }>
  staff:    Array<{ id: string; full_name: string | null }>
  services: Array<{ id: string; name: string; duration_minutes: number; category: string | null; price: number; color: string | null }>
}

export function NewApptModal({
  date,
  hour,
  onClose,
  tenantId,
  isManagerOrOwner,
  currentStaffId,
  onCreated,
  timezone,
}: {
  date: string
  hour: number
  onClose: () => void
  tenantId: string
  isManagerOrOwner: boolean
  currentStaffId: string | null
  onCreated: () => void
  timezone: string
}) {
  const [isMobile, setIsMobile]               = React.useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 1024px)').matches
  )
  const [options, setOptions]                 = React.useState<FormOptions | null>(null)
  const [loadingOptions, setLoading]          = React.useState(true)
  const [clientId, setClientId]               = React.useState('')
  const [serviceId, setServiceId]             = React.useState('')
  const [staffId, setStaffId]                 = React.useState('')
  const [locationId, setLocationId]           = React.useState('')
  const [locations, setLocations]             = React.useState<Array<{ id: string; name: string }>>([])
  const [staffWithLocIds, setStaffWithLocIds] = React.useState<Set<string>>(new Set())
  const [apptDate, setApptDate]               = React.useState(date)
  const [apptTime, setApptTime]               = React.useState(`${String(hour).padStart(2, '0')}:00`)
  const [notes, setNotes]                     = React.useState('')
  const [submitting, setSubmitting]           = React.useState(false)
  const [error, setError]                     = React.useState<string | null>(null)
  const [submitAttempted, setSubmitAttempted] = React.useState(false)
  const [errorScreen, setErrorScreen]         = React.useState<{ icon: string; title: string; body: string } | null>(null)
  const errorTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup error timer on unmount
  React.useEffect(() => {
    const ref = errorTimerRef
    return () => { if (ref.current) clearTimeout(ref.current) }
  }, [])

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Load form options + discover which staff have at least one location
  React.useEffect(() => {
    getCalendarioFormOptions(tenantId)
      .then(async (opts) => {
        const allIds  = opts.staff.map((s) => s.id)
        const withLocs = await getStaffIdsWithLocations(allIds)
        const locSet  = new Set(withLocs)
        setOptions(opts)
        setStaffWithLocIds(locSet)
        if (opts.services[0]) setServiceId(opts.services[0].id)
        // Smart default: prefer currentStaffId if it has locations,
        // else first staff with locations (managers), else leave empty.
        if (currentStaffId && locSet.has(currentStaffId)) {
          setStaffId(currentStaffId)
        } else if (isManagerOrOwner) {
          const first = opts.staff.find((s) => locSet.has(s.id))
          if (first) setStaffId(first.id)
        } else if (currentStaffId) {
          // Non-manager with no locations — assign their ID so location
          // effect runs, but warning is deferred until submit attempt.
          setStaffId(currentStaffId)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [tenantId, currentStaffId, isManagerOrOwner])

  // Reload locations whenever selected staff changes
  React.useEffect(() => {
    if (!staffId) return
    getStaffLocations(staffId, tenantId)
      .then((locs) => {
        setLocations(locs)
        if (locs.length === 1) {
          setLocationId(locs[0].id)
        } else if (locs.length > 1) {
          setLocationId((prev) => (locs.find((l) => l.id === prev) ? prev : locs[0].id))
        } else {
          setLocationId('')
        }
      })
      .catch((err) => console.error('[CalendarioClient] error:', err))
  }, [staffId, tenantId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitAttempted(true)
    if (!clientId || !serviceId || !staffId) { setError('Seleziona cliente, servizio e staff'); return }
    if (!locationId) { setError('Configura almeno una location per questo membro dello staff'); return }
    setSubmitting(true)
    setError(null)
    const svc   = options?.services.find((s) => s.id === serviceId)
    const dur   = svc?.duration_minutes ?? 60
    const start = localDatetimeToUtc(apptDate, apptTime, timezone)
    const end   = new Date(start.getTime() + dur * 60000)
    const res   = await createAppointment({
      tenantId, clientId, staffId,
      locationId,
      serviceIds: [serviceId],
      startTime: start.toISOString(),
      endTime:   end.toISOString(),
      notes: notes || null,
    })
    setSubmitting(false)
    if (!res.success) {
      const msg = res.error ?? 'Errore durante la creazione'
      let info: { icon: string; title: string; body: string }
      if (msg.toLowerCase().includes('overlap') || msg.includes('no_overlapping')) {
        info = { icon: '⚠️', title: 'Slot già occupato', body: 'C\'è già un appuntamento in questo orario.\nModifica orario o data e riprova.' }
      } else if (msg.toLowerCase().includes('not found') || msg.includes('not_found')) {
        info = { icon: '👤', title: 'Cliente non trovato', body: 'Il cliente selezionato non è disponibile.\nSeleziona un altro cliente e riprova.' }
      } else if (msg.toLowerCase().includes('missing') || msg.toLowerCase().includes('required')) {
        info = { icon: '📋', title: 'Campi mancanti', body: 'Compila tutti i campi obbligatori e riprova.' }
      } else {
        info = { icon: '❌', title: 'Errore', body: msg }
      }
      setErrorScreen(info)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      errorTimerRef.current = setTimeout(() => setErrorScreen(null), 3000)
      return
    }
    onCreated()
    onClose()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: 12,
    border: '1px solid #e5e5e5', fontSize: 15, color: '#111827',
    background: '#fafafa', outline: 'none', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#888',
    display: 'block', marginBottom: 6,
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.45)', zIndex: 1000,
    display: 'flex',
    alignItems: isMobile ? 'flex-end' : 'center',
    justifyContent: 'center',
    padding: isMobile ? 0 : 16,
  }
  const sheetStyle: React.CSSProperties = isMobile ? {
    background: '#FFF', borderRadius: 20,
    padding: '20px 20px 32px',
    width: 'calc(100% - 32px)',
    marginLeft: 16, marginRight: 16, marginBottom: 16,
    boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
    maxHeight: '90vh', overflowY: 'auto',
  } : {
    background: '#FFF', borderRadius: 20,
    padding: 28,
    width: '100%', maxWidth: 420,
    boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
    maxHeight: '90vh', overflowY: 'auto',
  }

  // Staff dropdown only shows members who have at least one location
  const staffForDropdown = options?.staff.filter((s) => staffWithLocIds.has(s.id)) ?? []

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={sheetStyle}>

        {/* Drag handle — mobile only */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>Nuovo appuntamento</h3>
          <button type="button" onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #E9E9E9', background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={14} color="#374151" />
          </button>
        </div>

        {loadingOptions ? (
          <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '24px 0' }}>Caricamento…</p>
        ) : (
          <div style={{ overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              {errorScreen ? (
                /* ── Error screen — slides in from right, out to left ── */
                <motion.div
                  key="error"
                  initial={{ opacity: 0, x: 80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -80 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0', textAlign: 'center' }}
                >
                  <span style={{ fontSize: 40 }}>{errorScreen.icon}</span>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>{errorScreen.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#6B7280', whiteSpace: 'pre-line' }}>{errorScreen.body}</p>
                </motion.div>
              ) : (
                /* ── Form — slides in from left, out to right ── */
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: -80 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 80 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Date + Time — stack vertically on mobile */}
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 16 : 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Data</label>
                  <DatePicker value={apptDate} onChange={setApptDate} placeholder="Seleziona data…" />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Ora</label>
                  <CustomSelect
                    value={apptTime}
                    onChange={setApptTime}
                    options={TIME_SLOT_OPTIONS}
                    placeholder="Seleziona orario…"
                  />
                </div>
              </div>

              {/* Client */}
              <div>
                <label style={labelStyle}>Cliente</label>
                <CustomSelect
                  value={clientId}
                  onChange={(v) => setClientId(v)}
                  options={(options?.clients ?? []).map((c) => ({ value: c.id, label: c.full_name ?? 'Cliente senza nome' }))}
                  placeholder="Seleziona cliente…"
                />
              </div>

              {/* Service */}
              <div>
                <label style={labelStyle}>Servizio</label>
                <CustomSelect
                  value={serviceId}
                  onChange={(v) => setServiceId(v)}
                  options={(options?.services ?? []).map((s) => ({ value: s.id, label: `${s.name} (${s.duration_minutes} min)` }))}
                  placeholder="Seleziona servizio…"
                />
              </div>

              {/* Staff — managers only, filtered to members who have locations */}
              {isManagerOrOwner && (
                <div>
                  <label style={labelStyle}>Staff</label>
                  <CustomSelect
                    value={staffId}
                    onChange={(v) => setStaffId(v)}
                    options={staffForDropdown.map((s) => ({ value: s.id, label: s.full_name ?? 'Staff' }))}
                    placeholder="Seleziona staff…"
                  />
                </div>
              )}

              {/* Location — only shown when multiple are available */}
              {locations.length > 1 && (
                <div>
                  <label style={labelStyle}>Location</label>
                  <CustomSelect
                    value={locationId}
                    onChange={(v) => setLocationId(v)}
                    options={locations.map((l) => ({ value: l.id, label: l.name }))}
                  />
                </div>
              )}

              {/* No-location warning — deferred until after first save attempt */}
              {locations.length === 0 && staffId && submitAttempted && (
                <div style={{ padding: '12px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#c2410c' }}>
                    ⚠️ Questo membro dello staff non ha location assegnate. Configura almeno una location.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label style={labelStyle}>Note (opzionale)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Inline error */}
              {error && <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{error}</p>}

              {/* Submit */}
              <button type="submit" disabled={submitting}
                style={{
                  width: '100%', height: 52, borderRadius: 14,
                  border: 'none', background: '#111827',
                  color: '#FFF', fontSize: 16, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  opacity: submitting ? 0.6 : 1,
                }}>
                {submitting ? 'Creazione…' : 'Crea appuntamento'}
              </button>

            </div>
          </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}
