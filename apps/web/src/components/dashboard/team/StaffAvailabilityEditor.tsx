'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getStaffAvailability, saveStaffAvailability } from '@/lib/actions/team'
import type { AvailabilityDay, StaffMemberRow } from '@/lib/actions/team'
import { CustomSelect } from '@/components/ui/custom-select'

// day_of_week DB convention: 1=Mon…6=Sat, 0=Sun — display order: 1,2,3,4,5,6,0
const DAY_LABELS: Record<number, string> = {
  1: 'Lunedì',
  2: 'Martedì',
  3: 'Mercoledì',
  4: 'Giovedì',
  5: 'Venerdì',
  6: 'Sabato',
  0: 'Domenica',
}

// 30-min steps from 06:00 to 23:30
const TIME_OPTIONS = Array.from({ length: 36 }, (_, i) => {
  const mins = 360 + i * 30 // 06:00 = 360 min
  const h = Math.floor(mins / 60).toString().padStart(2, '0')
  const m = (mins % 60).toString().padStart(2, '0')
  return { value: `${h}:${m}`, label: `${h}:${m}` }
})

// Normalize DB time values like "09:00:00" → "09:00"
function normalizeTime(t: string): string {
  return t.slice(0, 5)
}

interface Props {
  member: StaffMemberRow
  onClose: () => void
}

export function StaffAvailabilityEditor({ member, onClose }: Props) {
  const [days, setDays] = React.useState<AvailabilityDay[]>([])
  const [locations, setLocations] = React.useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    getStaffAvailability(member.id).then((data) => {
      if (!cancelled) {
        setDays(data.days)
        setLocations(data.locations)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [member.id])

  function toggleDay(dbDay: number) {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dbDay ? { ...d, is_active: !d.is_active } : d))
    )
  }

  function updateField(dbDay: number, field: keyof AvailabilityDay, value: string | null) {
    setDays((prev) =>
      prev.map((d) => (d.day_of_week === dbDay ? { ...d, [field]: value } : d))
    )
  }

  async function handleSave() {
    setSaving(true)
    try {
      const result = await saveStaffAvailability(member.id, days)
      if (result.success) {
        toast.success('Disponibilità salvata')
        onClose()
      } else {
        toast.error(result.error ?? 'Errore durante il salvataggio')
      }
    } finally {
      setSaving(false)
    }
  }

  const singleLocation = locations.length === 1

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 0' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-fg-muted)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Column header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: singleLocation ? '90px 1fr 1fr 40px' : '90px 140px 1fr 1fr 40px',
          gap: 8,
          padding: '0 4px 8px',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Giorno</span>
        {!singleLocation && (
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sede</span>
        )}
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Inizio</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-fg-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fine</span>
        <span />
      </div>

      {/* Day rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((day) => {
          const inactive = !day.is_active
          return (
            <div
              key={day.day_of_week}
              style={{
                display: 'grid',
                gridTemplateColumns: singleLocation ? '90px 1fr 1fr 40px' : '90px 140px 1fr 1fr 40px',
                gap: 8,
                alignItems: 'center',
                padding: '8px 4px',
                borderRadius: 10,
                background: inactive ? 'var(--color-bg-secondary)' : 'transparent',
                opacity: inactive ? 0.6 : 1,
                transition: 'opacity 150ms, background 150ms',
              }}
            >
              {/* Day label */}
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg)' }}>
                {DAY_LABELS[day.day_of_week]}
              </span>

              {/* Location dropdown — only for multi-location tenants */}
              {!singleLocation && (
                <div style={{ pointerEvents: inactive ? 'none' : 'auto' }}>
                  <CustomSelect
                    value={day.location_id ?? ''}
                    onChange={(v) => updateField(day.day_of_week, 'location_id', v || null)}
                    placeholder="— nessuna —"
                    options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                  />
                </div>
              )}

              {/* Start time */}
              <div style={{ pointerEvents: inactive ? 'none' : 'auto' }}>
                <CustomSelect
                  value={normalizeTime(day.start_time)}
                  onChange={(v) => updateField(day.day_of_week, 'start_time', v)}
                  options={TIME_OPTIONS}
                />
              </div>

              {/* End time */}
              <div style={{ pointerEvents: inactive ? 'none' : 'auto' }}>
                <CustomSelect
                  value={normalizeTime(day.end_time)}
                  onChange={(v) => updateField(day.day_of_week, 'end_time', v)}
                  options={TIME_OPTIONS}
                />
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(day.day_of_week)}
                aria-pressed={day.is_active}
                title={day.is_active ? 'Disabilita giorno' : 'Abilita giorno'}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 999,
                  border: 'none',
                  cursor: 'pointer',
                  background: day.is_active ? '#111827' : '#D1D5DB',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background 200ms',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: 2,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#FFF',
                    left: day.is_active ? 18 : 2,
                    transition: 'left 200ms',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
              </button>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', gap: 10, paddingTop: 16, marginTop: 8, borderTop: '1px solid var(--color-border)' }}>
        <button
          type="button"
          onClick={onClose}
          className="styll-btn-secondary"
          style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}
          disabled={saving}
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="styll-btn-primary"
          style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {saving ? 'Salvataggio...' : 'Salva disponibilità'}
        </button>
      </div>
    </div>
  )
}
