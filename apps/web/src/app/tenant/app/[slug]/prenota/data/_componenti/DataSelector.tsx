'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import BookingStep4DateTime from '@/components/pwa/booking/BookingStep4DateTime'
import type { GetAvailableSlotsResult } from '@/lib/actions/booking-slots'
import type { PublicStaffMember } from '@/lib/actions/public-booking'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { rescheduleClientAppointment } from '@/lib/actions/pwa-client-actions'

interface Props {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  serviceIds: string[]
  skip: string
  slotsByDate: Record<string, GetAvailableSlotsResult>
  staff: PublicStaffMember | null
  selectedServiceNames: string[]
  totalDurationMinutes?: number
  primaryColor?: string | null
  rescheduleAppointmentId?: string
  cancelAppointmentId?: string
}

type RescheduleStatus =
  | 'idle'
  | 'loading'
  | { ok: true; date: string; time: string }
  | { ok: false; error: string }

function RescheduleSheet({
  status,
  primaryColor,
  onOk,
  onRetry,
}: {
  status: { ok: true; date: string; time: string } | { ok: false; error: string }
  primaryColor: string
  onOk: () => void
  onRetry: () => void
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const formattedDate = status.ok
    ? new Intl.DateTimeFormat('it-IT', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      }).format(new Date(`${status.date}T12:00:00Z`))
    : ''

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 280ms ease',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          margin: 16,
          width: 'calc(100% - 32px)',
          backgroundColor: '#ffffff',
          borderRadius: 44,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          transform: visible ? 'translateY(0)' : 'translateY(110%)',
          transition: 'transform 290ms cubic-bezier(0.32, 0.72, 0, 1)',
          padding: 24,
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
        </div>

        {status.ok ? (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111111', margin: '0 0 8px' }}>
                Appuntamento modificato
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                Nuovo orario:{' '}
                <strong style={{ color: '#111111' }}>
                  {formattedDate} alle {status.time.slice(0, 5)}
                </strong>
              </p>
            </div>
            <button
              type="button"
              onClick={onOk}
              style={{
                display: 'flex',
                height: 50,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: primaryColor,
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Ok
            </button>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#111111', margin: '0 0 8px' }}>
                Modifica non riuscita
              </p>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>{status.error}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              style={{
                display: 'flex',
                height: 50,
                width: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 16,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                fontSize: 15,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Riprova
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function DataSelector({
  slug,
  tenantId,
  locationId,
  staffId,
  serviceIds,
  skip,
  slotsByDate,
  staff,
  selectedServiceNames,
  totalDurationMinutes,
  primaryColor,
  rescheduleAppointmentId,
  cancelAppointmentId,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)
  const brandColor = primaryColor ?? '#1a1a1a'

  const [rescheduleStatus, setRescheduleStatus] = useState<RescheduleStatus>('idle')

  function handleBack() {
    if (rescheduleAppointmentId) {
      router.push(tenantPath('/appuntamenti'))
      return
    }
    const params = new URLSearchParams({ location: locationId, staff: staffId })
    if (skip) params.set('_skip', skip)
    if (cancelAppointmentId) params.set('cancelAppointmentId', cancelAppointmentId)
    router.push(tenantPath(`/prenota/servizi?${params}`))
  }

  function handleSelect(date: string, time: string) {
    if (rescheduleAppointmentId) {
      setRescheduleStatus('loading')
      void rescheduleClientAppointment(tenantId, rescheduleAppointmentId, date, time).then((result) => {
        if (result.ok) {
          setRescheduleStatus({ ok: true, date, time })
        } else {
          setRescheduleStatus({ ok: false, error: result.error ?? 'Errore imprevisto' })
        }
      })
      return
    }

    const params = new URLSearchParams({
      location: locationId,
      staff: staffId,
      services: serviceIds.join(','),
      date,
      time,
    })
    if (skip) params.set('_skip', skip)
    if (cancelAppointmentId) params.set('cancelAppointmentId', cancelAppointmentId)
    router.push(tenantPath(`/prenota/conferma?${params}`))
  }

  return (
    <>
      <BookingStep4DateTime
        staff={staff}
        staffId={staffId}
        selectedServiceNames={selectedServiceNames}
        totalDurationMinutes={totalDurationMinutes}
        slotsByDate={slotsByDate}
        onBack={handleBack}
        onSelect={handleSelect}
        primaryColor={brandColor}
        isLoading={rescheduleStatus === 'loading'}
      />

      {typeof rescheduleStatus === 'object' && (
        <RescheduleSheet
          status={rescheduleStatus}
          primaryColor={brandColor}
          onOk={() => {
            router.push(tenantPath('/appuntamenti'))
            router.refresh()
          }}
          onRetry={() => setRescheduleStatus('idle')}
        />
      )}
    </>
  )
}
