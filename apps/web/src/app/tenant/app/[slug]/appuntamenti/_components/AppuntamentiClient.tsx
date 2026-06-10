'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { cancelClientAppointment } from '@/lib/actions/pwa-client-actions'

export type AppStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'

export interface AppointmentItem {
  id: string
  start_time: string
  status: AppStatus
  serviceNames: string
  staffName: string | null
  locationName: string | null
  locationAddress: string | null
  totalPrice: number | null
  staffId: string | null
  locationId: string | null
  serviceIds: string[]
}

interface Props {
  upcoming: AppointmentItem[]
  past: AppointmentItem[]
  tenantId: string
  slug: string
  primaryColor: string
  prenotaPath: string
}

const STATUS_LABELS: Record<AppStatus, string> = {
  confirmed: 'Confermato',
  pending: 'In attesa',
  completed: 'Completato',
  cancelled: 'Cancellato',
  no_show: 'Non presentato',
}

const STATUS_STYLES: Record<AppStatus, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-neutral-100 text-neutral-600',
  cancelled: 'bg-red-100 text-red-500',
  no_show: 'bg-red-50 text-red-400',
}

function formatDateParts(iso: string): { day: string; weekday: string; month: string; time: string } {
  const d = new Date(iso)
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('it-IT', opts).format(d)
  return {
    day: fmt({ day: 'numeric' }),
    weekday: fmt({ weekday: 'short' }),
    month: fmt({ month: 'short' }),
    time: fmt({ hour: '2-digit', minute: '2-digit' }),
  }
}

function formatFullDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n)
}

function AppCard({
  apt,
  primaryColor,
  onOpen,
}: {
  apt: AppointmentItem
  primaryColor: string
  onOpen: (apt: AppointmentItem) => void
}) {
  const { day, weekday, month, time } = formatDateParts(apt.start_time)

  return (
    <button
      type="button"
      onClick={() => onOpen(apt)}
      className="w-full text-left rounded-2xl bg-white border border-neutral-100 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden flex active:scale-[0.98] transition-transform"
    >
      {/* Date column */}
      <div
        className="flex flex-col items-center justify-center w-16 shrink-0 px-2 py-4"
        style={{ backgroundColor: primaryColor }}
      >
        <span className="text-[22px] font-black text-white leading-none">{day}</span>
        <span className="text-[10px] font-semibold text-white/80 uppercase mt-0.5">{weekday}</span>
        <span className="text-[10px] font-medium text-white/70 uppercase">{month}</span>
      </div>

      {/* Info column */}
      <div className="flex-1 px-4 py-3 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">{apt.serviceNames}</p>
        {apt.staffName && (
          <p className="mt-0.5 text-xs text-neutral-400 truncate">{apt.staffName}</p>
        )}
        <div className="mt-2 flex items-center gap-1.5 text-xs text-neutral-500">
          <Clock className="size-3 shrink-0" />
          <span>{time}</span>
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center pr-4">
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${STATUS_STYLES[apt.status]}`}>
          {STATUS_LABELS[apt.status]}
        </span>
      </div>
    </button>
  )
}

function DetailSheet({
  apt,
  onClose,
  tenantId,
  primaryColor,
  prenotaPath,
  slug,
}: {
  apt: AppointmentItem
  onClose: () => void
  tenantId: string
  primaryColor: string
  prenotaPath: string
  slug: string
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isFuture = new Date(apt.start_time) > new Date()
  const isActionable = isFuture && ['confirmed', 'pending'].includes(apt.status)

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelClientAppointment(tenantId, apt.id)
      if (res.ok) {
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  const rescheduleUrl = apt.staffId && apt.locationId
    ? `${prenotaPath}?location=${apt.locationId}&staff=${apt.staffId}&services=${apt.serviceIds.join(',')}&_skip=sede,barbiere,servizi`
    : prenotaPath

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="relative z-10 rounded-t-3xl bg-white shadow-2xl max-h-[85dvh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-200" />
        </div>

        <div className="px-5 pt-2 pb-10">
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 className="text-lg font-bold text-neutral-900">{apt.serviceNames}</h2>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[apt.status]}`}>
              {STATUS_LABELS[apt.status]}
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <InfoRow label="Data e ora" value={formatFullDate(apt.start_time)} />
            {apt.staffName && <InfoRow label="Barbiere" value={apt.staffName} />}
            {apt.locationName && (
              <InfoRow
                label="Sede"
                value={[apt.locationName, apt.locationAddress].filter(Boolean).join(' · ')}
              />
            )}
            {apt.totalPrice !== null && apt.totalPrice > 0 && (
              <InfoRow label="Totale stimato" value={formatPrice(apt.totalPrice)} />
            )}
          </div>

          {isActionable && (
            <div className="mt-6 flex flex-col gap-3">
              {!confirmDelete ? (
                <>
                  <Link
                    href={rescheduleUrl}
                    className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white active:opacity-80"
                    style={{ backgroundColor: primaryColor }}
                    onClick={onClose}
                  >
                    Modifica orario
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-red-500 border border-red-200 bg-red-50 active:bg-red-100"
                  >
                    Annulla appuntamento
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-neutral-600 mb-1">
                    Sei sicuro di voler annullare questo appuntamento?
                  </p>
                  {error && <p className="text-center text-xs text-red-500">{error}</p>}
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold text-white bg-red-500 active:opacity-80 disabled:opacity-60"
                  >
                    {isPending ? 'Annullamento…' : 'Conferma annullamento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConfirmDelete(false); setError(null) }}
                    className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-neutral-500 border border-neutral-200"
                  >
                    Torna indietro
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</span>
      <span className="text-sm text-neutral-800">{value}</span>
    </div>
  )
}

export function AppuntamentiClient({
  upcoming,
  past,
  tenantId,
  primaryColor,
  prenotaPath,
  slug,
}: Props) {
  const [selectedApt, setSelectedApt] = useState<AppointmentItem | null>(null)

  return (
    <>
      {/* Prossimi */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Prossimi</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-200 px-5 py-8 text-center">
            <p className="text-sm text-neutral-400 mb-3">Nessun appuntamento in programma</p>
            <Link
              href={prenotaPath}
              className="inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white active:opacity-80"
              style={{ backgroundColor: primaryColor }}
            >
              Prenota ora
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {upcoming.map((apt) => (
              <AppCard key={apt.id} apt={apt} primaryColor={primaryColor} onOpen={setSelectedApt} />
            ))}
          </div>
        )}
      </section>

      {/* Passati */}
      {past.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 mb-3">Storico</h2>
          <div className="flex flex-col gap-3">
            {past.map((apt) => (
              <AppCard key={apt.id} apt={apt} primaryColor={primaryColor} onOpen={setSelectedApt} />
            ))}
          </div>
        </section>
      )}

      {/* Detail sheet */}
      {selectedApt && (
        <DetailSheet
          apt={selectedApt}
          onClose={() => setSelectedApt(null)}
          tenantId={tenantId}
          primaryColor={primaryColor}
          prenotaPath={prenotaPath}
          slug={slug}
        />
      )}
    </>
  )
}
