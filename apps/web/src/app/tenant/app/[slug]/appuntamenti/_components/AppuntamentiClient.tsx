'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { Clock } from 'lucide-react'
import { cancelClientAppointment } from '@/lib/actions/pwa-client-actions'

export type AppStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'

export interface ServiceDetail {
  serviceId: string
  name: string
  priceAtBooking: number
  originalPrice: number | null
  appliedPromotionId: string | null
  promotionTitle: string | null
}

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
  serviceDetails?: ServiceDetail[]
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

const STATUS_STYLES: Record<AppStatus, { bg: string; color: string }> = {
  confirmed: { bg: '#dcfce7', color: '#16a34a' },
  pending: { bg: '#fef9c3', color: '#ca8a04' },
  completed: { bg: '#f3f4f6', color: '#6b7280' },
  cancelled: { bg: '#fee2e2', color: '#dc2626' },
  no_show: { bg: '#fee2e2', color: '#dc2626' },
}

function StatusBadge({ status, size = 'sm' }: { status: AppStatus; size?: 'sm' | 'lg' }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      style={{
        backgroundColor: s.bg,
        color: s.color,
        padding: size === 'lg' ? '4px 12px' : '3px 10px',
        borderRadius: 20,
        fontSize: size === 'lg' ? 13 : 12,
        fontWeight: 600,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function formatDateParts(iso: string): { day: string; weekday: string; month: string; time: string } {
  const d = new Date(iso)
  const fmt = (opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', opts).format(d)
  return {
    day: fmt({ day: 'numeric' }),
    weekday: fmt({ weekday: 'short' }),
    month: fmt({ month: 'short' }),
    time: fmt({ hour: '2-digit', minute: '2-digit' }),
  }
}

function formatFullDate(iso: string): string {
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  const time = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit' }).format(d)
  const capitalized = date.charAt(0).toUpperCase() + date.slice(1)
  return `${capitalized} · ${time}`
}

function formatPrice(n: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
  }).format(n)
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
  const { day, month, time } = formatDateParts(apt.start_time)

  return (
    <button
      type="button"
      onClick={() => onOpen(apt)}
      className="w-full text-left active:scale-[0.98] transition-transform"
      style={{
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {/* Date block */}
      <div
        style={{
          backgroundColor: primaryColor,
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          minWidth: 52,
        }}
      >
        <span style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', lineHeight: 1 }}>{day}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.70)',
            textTransform: 'uppercase',
            marginTop: 3,
          }}
        >
          {month}
        </span>
      </div>

      {/* Info column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#111111',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {apt.serviceNames}
        </p>
        {apt.staffName && (
          <p
            style={{
              fontSize: 13,
              color: '#9ca3af',
              margin: '2px 0 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {apt.staffName}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="#9ca3af" />
            <span style={{ fontSize: 13, color: '#9ca3af' }}>{time}</span>
          </div>
          <StatusBadge status={apt.status} />
        </div>
      </div>
    </button>
  )
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div>
      <div style={{ padding: '14px 0' }}>
        <span
          style={{
            display: 'block',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#9ca3af',
            marginBottom: 4,
          }}
        >
          {label}
        </span>
        <span style={{ fontSize: 15, color: '#111111' }}>{value}</span>
      </div>
      {!last && <div style={{ height: 1, backgroundColor: '#f3f4f6' }} />}
    </div>
  )
}

function DetailSheet({
  apt,
  onClose,
  tenantId,
  primaryColor,
  prenotaPath,
  slug: _slug,
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
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function close() {
    setVisible(false)
    setTimeout(onClose, 290)
  }

  const isFuture = new Date(apt.start_time) > new Date()
  const isActionable = isFuture && ['confirmed', 'pending'].includes(apt.status)

  function handleCancel() {
    startTransition(async () => {
      const res = await cancelClientAppointment(tenantId, apt.id)
      if (res.ok) {
        close()
      } else {
        setError(res.error)
      }
    })
  }

  const changeDateUrl =
    apt.staffId && apt.locationId
      ? `${prenotaPath}/data?location=${apt.locationId}&staff=${apt.staffId}&services=${apt.serviceIds.join(',')}&excludeAppointmentId=${apt.id}&rescheduleAppointmentId=${apt.id}`
      : prenotaPath

  const modifyUrl =
    apt.staffId && apt.locationId
      ? `${prenotaPath}/servizi?location=${apt.locationId}&staff=${apt.staffId}&services=${apt.serviceIds.join(',')}&cancelAppointmentId=${apt.id}`
      : prenotaPath

  const infoRows: Array<{ label: string; value: string }> = [
    { label: 'Data e ora', value: formatFullDate(apt.start_time) },
    ...(apt.staffName ? [{ label: 'Barbiere', value: apt.staffName }] : []),
    ...(apt.locationName
      ? [{ label: 'Sede', value: [apt.locationName, apt.locationAddress].filter(Boolean).join(' · ') }]
      : []),
    ...(apt.totalPrice !== null && apt.totalPrice > 0
      ? [{ label: 'Totale stimato', value: formatPrice(apt.totalPrice) }]
      : []),
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
      }}
    >
      {/* Overlay — covers everything including topbar and bottom nav */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 290ms ease',
        }}
        onClick={close}
      />

      {/* Sheet — floats 12px from all edges, rounded on all sides */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          margin: 12,
          width: 'calc(100% - 24px)',
          maxHeight: '85dvh',
          backgroundColor: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
          overflowY: 'auto',
          transform: visible ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 290ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
        </div>

        <div style={{ padding: 20, paddingBottom: 32 }}>
          {/* Title + badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 4,
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111111', margin: 0, flex: 1 }}>
              {apt.serviceNames}
            </h2>
            <StatusBadge status={apt.status} size="lg" />
          </div>

          {/* Per-service breakdown with optional promo badge */}
          {apt.serviceDetails && apt.serviceDetails.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              {apt.serviceDetails.map((s) => {
                const hasPromo = s.appliedPromotionId !== null
                const showStrike = hasPromo && s.originalPrice !== null && s.originalPrice > s.priceAtBooking
                return (
                  <div key={s.serviceId} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: 15, color: '#111111' }}>{s.name}</span>
                      {hasPromo && (
                        <span style={{ display: 'inline-block', marginLeft: 8, background: 'color-mix(in srgb, var(--brand-primary, #1a1a1a) 12%, transparent)', color: 'var(--brand-primary, #1a1a1a)', borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
                          Offerta applicata
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: hasPromo ? '#16a34a' : '#111111' }}>
                        {formatPrice(s.priceAtBooking)}
                      </span>
                      {showStrike && (
                        <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>
                          {formatPrice(s.originalPrice!)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Info rows */}
          <div>
            {infoRows.map((row, i) => (
              <InfoRow key={row.label} label={row.label} value={row.value} last={i === infoRows.length - 1} />
            ))}
          </div>

          {/* Actions */}
          {isActionable && (
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!confirmDelete ? (
                <>
                  <Link
                    href={changeDateUrl}
                    onClick={close}
                    style={{
                      display: 'flex',
                      height: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: 'transparent',
                      border: `2px solid ${primaryColor}`,
                      color: primaryColor,
                      fontSize: 15,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Cambia data e ora
                  </Link>
                  <Link
                    href={modifyUrl}
                    onClick={close}
                    style={{
                      display: 'flex',
                      height: 50,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: primaryColor,
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Modifica prenotazione
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    style={{
                      display: 'flex',
                      height: 50,
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: '#fee2e2',
                      color: '#dc2626',
                      fontSize: 15,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Annulla appuntamento
                  </button>
                </>
              ) : (
                <>
                  <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280', margin: '0 0 8px 0' }}>
                    Sei sicuro di voler annullare questo appuntamento?
                  </p>
                  {error && (
                    <p style={{ textAlign: 'center', fontSize: 12, color: '#dc2626', margin: '0 0 4px 0' }}>
                      {error}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    style={{
                      display: 'flex',
                      height: 50,
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: '#dc2626',
                      color: '#ffffff',
                      fontSize: 15,
                      fontWeight: 700,
                      border: 'none',
                      cursor: isPending ? 'not-allowed' : 'pointer',
                      opacity: isPending ? 0.6 : 1,
                    }}
                  >
                    {isPending ? 'Annullamento…' : 'Conferma annullamento'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDelete(false)
                      setError(null)
                    }}
                    style={{
                      display: 'flex',
                      height: 50,
                      width: '100%',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 16,
                      backgroundColor: '#f3f4f6',
                      color: '#6b7280',
                      fontSize: 15,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                    }}
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

      {/* Storico */}
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
