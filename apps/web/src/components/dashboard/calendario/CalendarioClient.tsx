'use client'

import * as React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type { CalendarioAppointment, CalendarioData } from '@/lib/actions/calendario'
import {
  createAppointment,
  getCalendarioFormOptions,
  getStaffIdsWithLocations,
  getStaffLocations,
  updateAppointmentServices,
  updateAppointmentStatus,
} from '@/lib/actions/calendario'

const HOUR_START = 8
const HOUR_END = 20
const HOUR_HEIGHT = 76
const DAYS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
const MONTHS_IT = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  taglio: { bg: '#dbeafe', text: '#1e3a5f', border: '#2563eb' },
  colore: { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  colorazione: { bg: '#ede9fe', text: '#4c1d95', border: '#7c3aed' },
  barba: { bg: '#dcfce7', text: '#14532d', border: '#16a34a' },
  trattamento: { bg: '#ffedd5', text: '#7c2d12', border: '#ea580c' },
  piega: { bg: '#fce7f3', text: '#831843', border: '#db2777' },
}

const DEFAULT_COLOR = { bg: '#f3f4f6', text: '#374151', border: '#6b7280' }

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confermato',
  pending: 'In attesa',
  completed: 'Completato',
  cancelled: 'Cancellato',
  no_show: 'No show',
}

const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

const emptySubscribe = () => () => undefined
const clientSnapshot = () => true
const serverSnapshot = () => false

interface Props {
  tenantId: string
  weekStart: string
  dayView?: string | null
  data: CalendarioData
  currentStaffId: string | null
  isManagerOrOwner: boolean
  selectedStaffId: string | null
}

interface FormOptions {
  clients: Array<{ id: string; full_name: string | null }>
  staff: Array<{ id: string; full_name: string | null }>
  services: Array<{
    id: string
    name: string
    duration_minutes: number
    category: string | null
    price: number
    color: string | null
  }>
}

interface NewAppointmentDraft {
  date: string
  hour: number
}

/** Adds days to an ISO date string without relying on the current time. */
function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

/** Formats a YYYY-MM-DD date for the calendar header. */
function formatDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`)
  return `${date.getDate()} ${MONTHS_IT[date.getMonth()]}`
}

/** Formats the visible week range. */
function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T12:00:00`)
  const end = new Date(`${addDays(weekStart, 5)}T12:00:00`)
  const startLabel = `${start.getDate()} ${MONTHS_IT[start.getMonth()]}`
  const endLabel = `${end.getDate()} ${MONTHS_IT[end.getMonth()]} ${end.getFullYear()}`
  return `${startLabel} - ${endLabel}`
}

/** Formats appointment times using the ISO string date part shown by the browser after mount. */
function formatTime(iso: string): string {
  const date = new Date(iso)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Returns appointment duration in minutes. */
function getDurationMinutes(appt: CalendarioAppointment): number {
  return Math.max(
    15,
    Math.round((new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime()) / 60000)
  )
}

/** Returns the absolute position of an appointment inside a day column. */
function getAppointmentStyle(appt: CalendarioAppointment): React.CSSProperties {
  const start = new Date(appt.start_time)
  const startMinutes = start.getHours() * 60 + start.getMinutes()
  const top = Math.max(0, (startMinutes - HOUR_START * 60) * (HOUR_HEIGHT / 60))
  const height = Math.max(32, getDurationMinutes(appt) * (HOUR_HEIGHT / 60))
  return { top, height }
}

/** Picks the configured service category color, falling back to a neutral color. */
function getCategoryColor(category?: string | null) {
  if (!category) return DEFAULT_COLOR
  return CATEGORY_COLORS[category.toLowerCase().trim()] ?? DEFAULT_COLOR
}

/** Sorts appointments by start time. */
function sortAppointments(appts: CalendarioAppointment[]): CalendarioAppointment[] {
  return [...appts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
}

/** Builds an ISO string from date + time inputs. */
function buildIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString()
}

/** Returns true only after hydration, avoiding server/client date rendering mismatches. */
function useHasHydrated(): boolean {
  return React.useSyncExternalStore(emptySubscribe, clientSnapshot, serverSnapshot)
}

/** Minimal select input used by the modals. */
function SelectField({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  placeholder?: string
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={inputStyle}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/** Shows and edits one appointment. */
function AppointmentDetailModal({
  appointment,
  tenantId,
  onClose,
  onSaved,
}: {
  appointment: CalendarioAppointment
  tenantId: string
  onClose: () => void
  onSaved: (appointment: CalendarioAppointment) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [status, setStatus] = React.useState(appointment.status)
  const [notes, setNotes] = React.useState(appointment.notes ?? '')
  const [serviceId, setServiceId] = React.useState(appointment.services[0]?.id ?? '')
  const [options, setOptions] = React.useState<FormOptions | null>(null)
  const [loadingOptions, setLoadingOptions] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    getCalendarioFormOptions(tenantId)
      .then((result) => {
        if (active) setOptions(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Errore caricamento opzioni')
      })
      .finally(() => {
        if (active) setLoadingOptions(false)
      })

    return () => {
      active = false
    }
  }, [tenantId])

  const handleSave = React.useCallback(async () => {
    setSaving(true)
    setError(null)

    try {
      const statusResult = await updateAppointmentStatus(appointment.id, status, notes || null)
      if (!statusResult.success) {
        setError(statusResult.error ?? 'Errore durante il salvataggio')
        return
      }

      const serviceIds = serviceId ? [serviceId] : []
      const servicesResult = await updateAppointmentServices(appointment.id, serviceIds, tenantId)
      if (!servicesResult.success) {
        setError(servicesResult.error ?? 'Errore aggiornamento servizi')
        return
      }

      const selectedService = options?.services.find((service) => service.id === serviceId)
      onSaved({
        ...appointment,
        status,
        notes: notes || null,
        services: selectedService
          ? [
              {
                id: selectedService.id,
                name: selectedService.name,
                category: selectedService.category,
                color: selectedService.color,
                duration_minutes: selectedService.duration_minutes,
              },
            ]
          : [],
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSaving(false)
    }
  }, [appointment, notes, onClose, onSaved, options, serviceId, status, tenantId])

  const handleCancelAppointment = React.useCallback(async () => {
    setStatus('cancelled')
    setSaving(true)
    setError(null)

    try {
      const result = await updateAppointmentStatus(appointment.id, 'cancelled', notes || null)
      if (!result.success) {
        setError(result.error ?? 'Errore durante la cancellazione')
        return
      }
      onSaved({ ...appointment, status: 'cancelled', notes: notes || null })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore imprevisto')
    } finally {
      setSaving(false)
    }
  }, [appointment, notes, onClose, onSaved])

  const firstService = appointment.services[0]
  const color = getCategoryColor(firstService?.category)

  return (
    <Modal onClose={onClose}>
      <div style={modalHeaderStyle}>
        <div>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 12 }}>
            {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
          </p>
          <h2 style={{ margin: '4px 0 0', fontSize: 22, color: '#111827' }}>
            {appointment.client_name}
          </h2>
        </div>
        <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Chiudi">
          <X size={16} />
        </button>
      </div>

      <div
        style={{
          borderLeft: `4px solid ${color.border}`,
          background: color.bg,
          color: color.text,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <strong>{firstService?.name ?? 'Nessun servizio'}</strong>
        <div style={{ fontSize: 13, marginTop: 4 }}>
          {STATUS_LABELS[appointment.status] ?? appointment.status}
          {' · '}
          {getDurationMinutes(appointment)} min
        </div>
      </div>

      {editing ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {loadingOptions ? (
            <p style={mutedTextStyle}>Caricamento opzioni...</p>
          ) : (
            <label style={fieldLabelStyle}>
              Servizio
              <SelectField
                value={serviceId}
                onChange={setServiceId}
                placeholder="Nessun servizio"
                options={(options?.services ?? []).map((service) => ({
                  value: service.id,
                  label: `${service.name} (${service.duration_minutes} min)`,
                }))}
              />
            </label>
          )}

          <label style={fieldLabelStyle}>
            Stato
            <SelectField value={status} onChange={setStatus} options={STATUS_OPTIONS} />
          </label>

          <label style={fieldLabelStyle}>
            Note
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          {error && <p style={errorTextStyle}>{error}</p>}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              style={secondaryButtonStyle}
            >
              Annulla
            </button>
            <button type="button" onClick={handleSave} disabled={saving} style={primaryButtonStyle}>
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {appointment.notes && <p style={{ margin: 0, color: '#374151' }}>{appointment.notes}</p>}
          {error && <p style={errorTextStyle}>{error}</p>}
          <button type="button" onClick={() => setEditing(true)} style={primaryButtonStyle}>
            Modifica
          </button>
          {appointment.status !== 'cancelled' && (
            <button
              type="button"
              onClick={handleCancelAppointment}
              disabled={saving}
              style={dangerButtonStyle}
            >
              {saving ? 'Cancellazione...' : 'Cancella appuntamento'}
            </button>
          )}
        </div>
      )}
    </Modal>
  )
}

/** Creates one appointment from a selected day/hour cell. */
function NewAppointmentModal({
  draft,
  tenantId,
  currentStaffId,
  selectedStaffId,
  isManagerOrOwner,
  onClose,
  onCreated,
}: {
  draft: NewAppointmentDraft
  tenantId: string
  currentStaffId: string | null
  selectedStaffId: string | null
  isManagerOrOwner: boolean
  onClose: () => void
  onCreated: (appointment: CalendarioAppointment) => void
}) {
  const [options, setOptions] = React.useState<FormOptions | null>(null)
  const [locations, setLocations] = React.useState<Array<{ id: string; name: string }>>([])
  const [staffWithLocations, setStaffWithLocations] = React.useState<Set<string>>(new Set())
  const [clientId, setClientId] = React.useState('')
  const [serviceId, setServiceId] = React.useState('')
  const [staffId, setStaffId] = React.useState(selectedStaffId ?? currentStaffId ?? '')
  const [locationId, setLocationId] = React.useState('')
  const [date, setDate] = React.useState(draft.date)
  const [time, setTime] = React.useState(`${String(draft.hour).padStart(2, '0')}:00`)
  const [notes, setNotes] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let active = true

    getCalendarioFormOptions(tenantId)
      .then(async (result) => {
        const staffIds = result.staff.map((staff) => staff.id)
        const staffLocationIds = await getStaffIdsWithLocations(staffIds)

        if (!active) return

        const staffSet = new Set(staffLocationIds)
        const defaultStaff =
          selectedStaffId ??
          (currentStaffId && staffSet.has(currentStaffId) ? currentStaffId : null) ??
          result.staff.find((staff) => staffSet.has(staff.id))?.id ??
          currentStaffId ??
          ''

        setOptions(result)
        setStaffWithLocations(staffSet)
        setClientId(result.clients[0]?.id ?? '')
        setServiceId(result.services[0]?.id ?? '')
        setStaffId(defaultStaff)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Errore caricamento opzioni')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [currentStaffId, selectedStaffId, tenantId])

  React.useEffect(() => {
    let active = true

    if (!staffId) {
      return () => {
        active = false
      }
    }

    getStaffLocations(staffId, tenantId)
      .then((result) => {
        if (!active) return
        setLocations(result)
        setLocationId((previous) => {
          if (result.some((location) => location.id === previous)) return previous
          return result[0]?.id ?? ''
        })
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Errore caricamento location')
      })

    return () => {
      active = false
    }
  }, [staffId, tenantId])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      setError(null)

      const selectedClient = options?.clients.find((client) => client.id === clientId)
      const selectedService = options?.services.find((service) => service.id === serviceId)

      if (!selectedClient || !selectedService || !staffId) {
        setError('Seleziona cliente, servizio e staff')
        return
      }
      if (!locationId) {
        setError('Configura almeno una location per questo membro dello staff')
        return
      }

      setSaving(true)
      try {
        const startTime = buildIso(date, time)
        const endDate = new Date(startTime)
        endDate.setMinutes(endDate.getMinutes() + selectedService.duration_minutes)

        const result = await createAppointment({
          tenantId,
          clientId,
          staffId,
          locationId,
          serviceIds: [serviceId],
          startTime,
          endTime: endDate.toISOString(),
          notes: notes || null,
        })

        if (!result.success || !result.appointmentId) {
          setError(result.error ?? 'Errore durante la creazione')
          return
        }

        onCreated({
          id: result.appointmentId,
          start_time: startTime,
          end_time: endDate.toISOString(),
          status: 'confirmed',
          booking_source: 'dashboard_owner',
          notes: notes || null,
          client_id: clientId,
          staff_id: staffId,
          client_name: selectedClient.full_name ?? 'Cliente',
          services: [
            {
              id: selectedService.id,
              name: selectedService.name,
              category: selectedService.category,
              color: selectedService.color,
              duration_minutes: selectedService.duration_minutes,
            },
          ],
        })
        onClose()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore imprevisto')
      } finally {
        setSaving(false)
      }
    },
    [clientId, date, locationId, notes, onClose, onCreated, options, serviceId, staffId, tenantId, time]
  )

  const staffOptions = (options?.staff ?? [])
    .filter((staff) => !isManagerOrOwner || staffWithLocations.has(staff.id))
    .map((staff) => ({ value: staff.id, label: staff.full_name ?? 'Staff' }))

  return (
    <Modal onClose={onClose}>
      <div style={modalHeaderStyle}>
        <h2 style={{ margin: 0, fontSize: 22, color: '#111827' }}>Nuovo appuntamento</h2>
        <button type="button" onClick={onClose} style={iconButtonStyle} aria-label="Chiudi">
          <X size={16} />
        </button>
      </div>

      {loading ? (
        <p style={mutedTextStyle}>Caricamento...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <label style={fieldLabelStyle}>
            Data
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={fieldLabelStyle}>
            Ora
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              step={900}
              style={inputStyle}
            />
          </label>

          <label style={fieldLabelStyle}>
            Cliente
            <SelectField
              value={clientId}
              onChange={setClientId}
              placeholder="Seleziona cliente"
              options={(options?.clients ?? []).map((client) => ({
                value: client.id,
                label: client.full_name ?? 'Cliente senza nome',
              }))}
            />
          </label>

          <label style={fieldLabelStyle}>
            Servizio
            <SelectField
              value={serviceId}
              onChange={setServiceId}
              placeholder="Seleziona servizio"
              options={(options?.services ?? []).map((service) => ({
                value: service.id,
                label: `${service.name} (${service.duration_minutes} min)`,
              }))}
            />
          </label>

          {isManagerOrOwner && (
            <label style={fieldLabelStyle}>
              Staff
              <SelectField
                value={staffId}
                onChange={setStaffId}
                placeholder="Seleziona staff"
                options={staffOptions}
              />
            </label>
          )}

          {locations.length > 1 && (
            <label style={fieldLabelStyle}>
              Location
              <SelectField
                value={locationId}
                onChange={setLocationId}
                options={locations.map((location) => ({
                  value: location.id,
                  label: location.name,
                }))}
              />
            </label>
          )}

          <label style={fieldLabelStyle}>
            Note
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          {error && <p style={errorTextStyle}>{error}</p>}

          <button type="submit" disabled={saving} style={primaryButtonStyle}>
            {saving ? 'Creazione...' : 'Crea appuntamento'}
          </button>
        </form>
      )}
    </Modal>
  )
}

/** Basic modal wrapper with stable markup and no portal/ref logic. */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(17, 24, 39, 0.48)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 20,
          background: '#fff',
          padding: 24,
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.22)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

/** Minimal, stable weekly calendar client. */
export function CalendarioClient({
  tenantId,
  weekStart,
  data,
  currentStaffId,
  isManagerOrOwner,
  selectedStaffId,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const mounted = useHasHydrated()
  const [createdAppointments, setCreatedAppointments] = React.useState<CalendarioAppointment[]>([])
  const [updatedAppointments, setUpdatedAppointments] = React.useState<
    Record<string, CalendarioAppointment>
  >({})
  const [selectedAppointment, setSelectedAppointment] =
    React.useState<CalendarioAppointment | null>(null)
  const [newAppointmentDraft, setNewAppointmentDraft] = React.useState<NewAppointmentDraft | null>(
    null
  )

  const weekDays = React.useMemo(
    () => Array.from({ length: 6 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  )

  const appointments = React.useMemo(() => {
    const serverIds = new Set(data.appointments.map((appointment) => appointment.id))
    const serverAppointments = data.appointments.map(
      (appointment) => updatedAppointments[appointment.id] ?? appointment
    )
    const optimisticAppointments = createdAppointments.filter(
      (appointment) => !serverIds.has(appointment.id)
    )
    return sortAppointments([...serverAppointments, ...optimisticAppointments])
  }, [createdAppointments, data.appointments, updatedAppointments])

  const navigateWeek = React.useCallback(
    (direction: -1 | 1) => {
      const params = new URLSearchParams()
      params.set('week', addDays(weekStart, direction * 7))
      if (selectedStaffId) params.set('staff', selectedStaffId)
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, selectedStaffId, weekStart]
  )

  const goToCurrentWeek = React.useCallback(() => {
    router.push(pathname)
  }, [pathname, router])

  const handleStaffChange = React.useCallback(
    (staffId: string) => {
      const params = new URLSearchParams()
      params.set('week', weekStart)
      if (staffId) params.set('staff', staffId)
      router.push(`${pathname}?${params.toString()}`)
    },
    [pathname, router, weekStart]
  )

  const openNewAppointment = React.useCallback((date: string, hour: number) => {
    setNewAppointmentDraft({ date, hour })
  }, [])

  const handleAppointmentCreated = React.useCallback(
    (appointment: CalendarioAppointment) => {
      setCreatedAppointments((current) => sortAppointments([...current, appointment]))
      router.refresh()
    },
    [router]
  )

  const handleAppointmentSaved = React.useCallback(
    (appointment: CalendarioAppointment) => {
      setUpdatedAppointments((current) => ({ ...current, [appointment.id]: appointment }))
      router.refresh()
    },
    [router]
  )

  if (!mounted) {
    return (
      <div style={{ padding: 24, color: '#6b7280', fontSize: 14 }}>Caricamento calendario...</div>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', padding: 20 }}>
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: 0, color: '#111827', fontSize: 28, fontWeight: 750 }}>
            Calendario
          </h1>
          <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
            {formatWeekRange(weekStart)}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {isManagerOrOwner && (
            <select
              value={selectedStaffId ?? ''}
              onChange={(event) => handleStaffChange(event.target.value)}
              style={{ ...inputStyle, width: 190, background: '#fff' }}
            >
              <option value="">Tutto lo staff</option>
              {data.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name ?? 'Staff'}
                </option>
              ))}
            </select>
          )}

          <button type="button" onClick={() => navigateWeek(-1)} style={toolbarButtonStyle}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" onClick={goToCurrentWeek} style={toolbarButtonStyle}>
            Oggi
          </button>
          <button type="button" onClick={() => navigateWeek(1)} style={toolbarButtonStyle}>
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '64px repeat(6, minmax(150px, 1fr))',
          overflowX: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 18,
          background: '#fff',
        }}
      >
        <div style={calendarHeaderStyle} />
        {weekDays.map((date, index) => (
          <div key={date} style={calendarHeaderStyle}>
            <strong style={{ color: '#111827' }}>{DAYS[index]}</strong>
            <span style={{ display: 'block', color: '#6b7280', fontSize: 12 }}>
              {formatDateLabel(date)}
            </span>
          </div>
        ))}

        <div style={{ borderRight: '1px solid #e5e7eb' }}>
          {Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index).map(
            (hour) => (
              <div key={hour} style={timeCellStyle}>
                {String(hour).padStart(2, '0')}:00
              </div>
            )
          )}
        </div>

        {weekDays.map((date) => {
          const dayAppointments = appointments.filter(
            (appointment) => appointment.start_time.slice(0, 10) === date
          )

          return (
            <div key={date} style={dayColumnStyle}>
              {Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index).map(
                (hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => openNewAppointment(date, hour)}
                    style={emptyCellStyle}
                    aria-label={`Crea appuntamento ${date} ${hour}:00`}
                  >
                    <Plus size={14} />
                  </button>
                )
              )}

              {dayAppointments.map((appointment) => {
                const firstService = appointment.services[0]
                const color = getCategoryColor(firstService?.category)

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setSelectedAppointment(appointment)
                    }}
                    style={{
                      ...appointmentCardStyle,
                      ...getAppointmentStyle(appointment),
                      background: color.bg,
                      borderLeft: `4px solid ${color.border}`,
                      color: color.text,
                    }}
                  >
                    <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.2 }}>
                      {appointment.client_name}
                    </strong>
                    <span style={{ display: 'block', fontSize: 12, marginTop: 2 }}>
                      {formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}
                    </span>
                    <span
                      style={{
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {firstService?.name ?? STATUS_LABELS[appointment.status] ?? appointment.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )
        })}
      </section>

      {selectedAppointment && (
        <AppointmentDetailModal
          appointment={selectedAppointment}
          tenantId={tenantId}
          onClose={() => setSelectedAppointment(null)}
          onSaved={handleAppointmentSaved}
        />
      )}

      {newAppointmentDraft && (
        <NewAppointmentModal
          draft={newAppointmentDraft}
          tenantId={tenantId}
          currentStaffId={currentStaffId}
          selectedStaffId={selectedStaffId}
          isManagerOrOwner={isManagerOrOwner}
          onClose={() => setNewAppointmentDraft(null)}
          onCreated={handleAppointmentCreated}
        />
      )}
    </main>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#111827',
  fontSize: 14,
  padding: '10px 12px',
  boxSizing: 'border-box',
}

const fieldLabelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  color: '#374151',
  fontSize: 13,
  fontWeight: 650,
}

const modalHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
  marginBottom: 18,
}

const iconButtonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: '1px solid #e5e7eb',
  borderRadius: 999,
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const primaryButtonStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 12,
  background: '#111827',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 700,
  padding: '11px 14px',
}

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#374151',
}

const dangerButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  border: '1px solid #dc2626',
  background: '#fff',
  color: '#dc2626',
}

const toolbarButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 40,
  border: '1px solid #d1d5db',
  borderRadius: 10,
  background: '#fff',
  color: '#111827',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 650,
  padding: '8px 12px',
}

const calendarHeaderStyle: React.CSSProperties = {
  minWidth: 150,
  borderBottom: '1px solid #e5e7eb',
  borderRight: '1px solid #e5e7eb',
  padding: '12px 10px',
  background: '#f9fafb',
  textAlign: 'center',
}

const timeCellStyle: React.CSSProperties = {
  height: HOUR_HEIGHT,
  borderBottom: '1px solid #f1f5f9',
  color: '#6b7280',
  fontSize: 12,
  paddingTop: 8,
  textAlign: 'center',
  boxSizing: 'border-box',
}

const dayColumnStyle: React.CSSProperties = {
  position: 'relative',
  minWidth: 150,
  minHeight: (HOUR_END - HOUR_START) * HOUR_HEIGHT,
  borderRight: '1px solid #e5e7eb',
}

const emptyCellStyle: React.CSSProperties = {
  width: '100%',
  height: HOUR_HEIGHT,
  border: 'none',
  borderBottom: '1px solid #f1f5f9',
  background: 'transparent',
  color: '#cbd5e1',
  cursor: 'pointer',
}

const appointmentCardStyle: React.CSSProperties = {
  position: 'absolute',
  left: 8,
  right: 8,
  zIndex: 2,
  border: 'none',
  borderRadius: 12,
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
  cursor: 'pointer',
  overflow: 'hidden',
  padding: '8px 10px',
  textAlign: 'left',
}

const mutedTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#6b7280',
  fontSize: 14,
}

const errorTextStyle: React.CSSProperties = {
  margin: 0,
  color: '#dc2626',
  fontSize: 13,
}
