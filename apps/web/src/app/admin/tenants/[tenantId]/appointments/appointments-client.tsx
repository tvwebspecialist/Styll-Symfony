'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Sparkles, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { AdminModal, ConfirmDialog } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  type AppointmentFormOptions,
  type TenantAppointmentDetailedRow,
} from '@/app/admin/actions'
import {
  createAppointment,
  deleteAppointment,
  seedRandomAppointments,
  updateAppointmentStatus,
  type AppointmentStatus,
} from '@/lib/actions/appointments'

const STATUS_BADGE: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-zinc-100 text-zinc-700  ',
  no_show: 'bg-rose-100 text-rose-700',
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confermato',
  pending: 'In attesa',
  cancelled: 'Annullato',
  completed: 'Completato',
  no_show: 'No show',
}

interface NewForm {
  clientId: string
  staffId: string
  locationId: string
  serviceIds: string[]
  date: string
  time: string
}

const EMPTY: NewForm = {
  clientId: '',
  staffId: '',
  locationId: '',
  serviceIds: [],
  date: '',
  time: '',
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function defaultDateTime(): { date: string; time: string } {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 30)
  d.setSeconds(0, 0)
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  return { date, time }
}

export function TenantAppointmentsClient({
  tenantId,
  appointments,
  options,
  optionsError,
}: {
  tenantId: string
  appointments: TenantAppointmentDetailedRow[]
  options: AppointmentFormOptions
  optionsError: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState<NewForm>(EMPTY)
  const [saving, setSaving] = React.useState(false)
  const [seeding, setSeeding] = React.useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  const totalDuration = form.serviceIds.reduce((s, id) => {
    const sv = options.services.find((x) => x.id === id)
    return s + (sv?.duration_minutes ?? 0)
  }, 0)
  const totalPrice = form.serviceIds.reduce((s, id) => {
    const sv = options.services.find((x) => x.id === id)
    return s + (sv?.price ?? 0)
  }, 0)

  const startIso =
    form.date && form.time ? new Date(`${form.date}T${form.time}:00`) : null
  const endIso = startIso
    ? new Date(startIso.getTime() + (totalDuration || 30) * 60_000)
    : null
  const [now, setNow] = React.useState<number | null>(null)
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const isPast = startIso && now !== null ? startIso.getTime() < now : false

  function openNew() {
    const { date, time } = defaultDateTime()
    setForm({ ...EMPTY, date, time })
    setOpen(true)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.clientId || !form.staffId || !form.locationId) {
      toast.error('Cliente, staff e sede sono obbligatori.')
      return
    }
    if (!form.serviceIds.length) {
      toast.error('Seleziona almeno un servizio.')
      return
    }
    if (!form.date || !form.time) {
      toast.error('Data e ora obbligatorie.')
      return
    }
    setSaving(true)
    const res = await createAppointment({
      tenantId,
      clientId: form.clientId,
      staffId: form.staffId,
      locationId: form.locationId,
      serviceIds: form.serviceIds,
      startTime: new Date(`${form.date}T${form.time}:00`).toISOString(),
    })
    setSaving(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore creazione appuntamento.')
      return
    }
    toast.success('Appuntamento creato.')
    setOpen(false)
    setForm(EMPTY)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirmDeleteId) return
    setDeleting(true)
    const res = await deleteAppointment(tenantId, confirmDeleteId)
    setDeleting(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore eliminazione.')
      return
    }
    toast.success('Appuntamento eliminato.')
    setConfirmDeleteId(null)
    router.refresh()
  }

  async function handleStatus(id: string, status: AppointmentStatus) {
    const res = await updateAppointmentStatus(tenantId, id, status)
    if (!res.success) {
      toast.error(res.error ?? 'Errore aggiornamento.')
      return
    }
    toast.success(`Stato aggiornato: ${STATUS_LABEL[status] ?? status}`)
    router.refresh()
  }

  async function handleSeed() {
    setSeeding(true)
    const res = await seedRandomAppointments(tenantId, 25)
    setSeeding(false)
    if (!res.success) {
      toast.error(res.error ?? 'Errore seed.')
      return
    }
    toast.success(`Generati ${res.inserted ?? 0} appuntamenti.`)
    router.refresh()
  }

  const target = appointments.find((a) => a.id === confirmDeleteId)

  const canCreate =
    options.clients.length > 0 &&
    options.staff.length > 0 &&
    options.services.length > 0 &&
    options.locations.length > 0

  return (
    <div className="rounded-xl border bg-white p-5 ">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Appuntamenti</h2>
          <p className="text-xs text-muted-foreground">
            {appointments.length} risultati (max 200)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSeed}
            disabled={seeding || !canCreate}
            title={
              !canCreate
                ? 'Servono clienti, staff, servizi e sedi per generare dati demo.'
                : undefined
            }
          >
            <Sparkles className="mr-1.5 h-4 w-4" />
            {seeding ? 'Generando…' : 'Genera 25 appuntamenti random'}
          </Button>
          <Button type="button" size="sm" onClick={openNew} disabled={!canCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nuovo appuntamento
          </Button>
        </div>
      </div>

      {optionsError ? (
        <p className="mt-3 text-xs text-amber-600">
          Avviso opzioni: {optionsError}
        </p>
      ) : null}

      {!canCreate ? (
        <p className="mt-4 text-xs text-amber-600">
          Per creare appuntamenti servono almeno: 1 cliente, 1 membro staff
          attivo, 1 servizio attivo e 1 sede.
        </p>
      ) : null}

      {appointments.length === 0 ? (
        <p className="mt-6 text-xs text-muted-foreground">
          Nessun appuntamento. Creane uno o usa “Genera 25 appuntamenti random”.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border ">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-semibold">Data / ora</th>
                <th className="px-3 py-2 font-semibold">Cliente</th>
                <th className="px-3 py-2 font-semibold">Staff</th>
                <th className="px-3 py-2 font-semibold">Servizi</th>
                <th className="px-3 py-2 font-semibold text-right">Totale</th>
                <th className="px-3 py-2 font-semibold">Stato</th>
                <th className="px-3 py-2 font-semibold w-44 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => {
                const cls = STATUS_BADGE[a.status] ?? STATUS_BADGE.completed
                return (
                  <tr key={a.id} className="border-t ">
                    <td className="px-3 py-2 tabular-nums">
                      {new Date(a.start_time).toLocaleString('it-IT', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-3 py-2">{a.client_name ?? '—'}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.staff_name ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {a.service_names.length
                        ? a.service_names.join(', ')
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      € {a.total_price.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}
                      >
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {a.status !== 'completed' ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStatus(a.id, 'completed')}
                            title="Segna come completato"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setConfirmDeleteId(a.id)}
                          aria-label="Elimina"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setForm(EMPTY)
        }}
        title="Nuovo appuntamento"
        description="Crea un appuntamento manuale per questo tenant."
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
      >
        <form className="flex flex-col gap-3" onSubmit={handleCreate}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="client">Cliente</Label>
              <select
                id="client"
                value={form.clientId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, clientId: e.target.value }))
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                required
              >
                <option value="">Seleziona…</option>
                {options.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ?? c.email ?? c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff">Staff</Label>
              <select
                id="staff"
                value={form.staffId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, staffId: e.target.value }))
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                required
              >
                <option value="">Seleziona…</option>
                {options.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name ?? s.role ?? s.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="loc">Sede</Label>
              <select
                id="loc"
                value={form.locationId}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationId: e.target.value }))
                }
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                required
              >
                <option value="">Seleziona…</option>
                {options.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Inizio</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  required
                />
                <Input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Servizi</Label>
            <div className="max-h-48 overflow-y-auto rounded-md border p-2 ">
              {options.services.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nessun servizio attivo.
                </p>
              ) : (
                options.services.map((s) => {
                  const checked = form.serviceIds.includes(s.id)
                  return (
                    <label
                      key={s.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            serviceIds: e.target.checked
                              ? [...f.serviceIds, s.id]
                              : f.serviceIds.filter((x) => x !== s.id),
                          }))
                        }
                      />
                      <span className="flex-1">{s.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.duration_minutes}min · €{s.price.toFixed(2)}
                      </span>
                    </label>
                  )
                })
              )}
            </div>
          </div>

          {form.serviceIds.length > 0 && startIso && endIso ? (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground ">
              Durata totale: <strong>{totalDuration || 30} min</strong> · Fine
              prevista:{' '}
              <strong>
                {endIso.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
              </strong>{' '}
              · Totale: <strong>€ {totalPrice.toFixed(2)}</strong>
            </div>
          ) : null}

          {isPast ? (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Stai creando un appuntamento nel passato. L&apos;admin può
                farlo, ma verifica che sia voluto.
              </span>
            </div>
          ) : null}

          <div className="mt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
                setForm(EMPTY)
              }}
            >
              Annulla
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvataggio…' : 'Crea appuntamento'}
            </Button>
          </div>
        </form>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => {
          if (!v) setConfirmDeleteId(null)
        }}
        title="Elimina appuntamento"
        description={
          target
            ? `Eliminare l'appuntamento del ${new Date(target.start_time).toLocaleString('it-IT')}? L'azione è irreversibile.`
            : 'Sei sicuro?'
        }
        confirmLabel={deleting ? 'Eliminazione…' : 'Elimina'}
        onConfirm={handleDelete}
        destructive
      />
    </div>
  )
}
