'use client'

import Link from 'next/link'
import { type FormEvent, useMemo, useState, useTransition } from 'react'
import BookingStepIndicator from './BookingStepIndicator'
import { BottomCTA } from '../ui/BottomCTA'
import { BookingAuthStep } from './BookingAuthStep'
import { createGuestBooking, type CreateGuestBookingResult } from '@/lib/actions/create-booking'
import type {
  PublicLocation,
  PublicService,
  PublicStaffMember,
} from '@/lib/actions/public-booking'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface Props {
  slug: string
  tenantId: string
  locationId: string
  staffId: string
  staff: PublicStaffMember
  location: PublicLocation
  services: PublicService[]
  date: string
  time: string
  onBack: () => void
  onSuccess: (appointmentId: string) => void
  primaryColor?: string
  skipLocationStep?: boolean
  initialFullName?: string
  initialPhone?: string
  initialEmail?: string
  isLoggedIn?: boolean
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function formatBookingDate(date: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))
}

function inputStyle(brandColor: string, hasError: boolean) {
  return {
    width: '100%',
    padding: '14px 16px',
    borderRadius: 12,
    border: `1.5px solid ${hasError ? '#DC2626' : '#E0E0E0'}`,
    background: 'white',
    fontSize: 15,
    color: '#111',
    outline: 'none',
    boxSizing: 'border-box' as const,
    boxShadow: hasError ? 'none' : `0 0 0 0 ${brandColor}`,
  }
}

export default function BookingStep5Confirm({
  slug,
  tenantId,
  locationId,
  staffId,
  staff,
  location,
  services,
  date,
  time,
  onBack,
  onSuccess,
  primaryColor,
  skipLocationStep = false,
  initialFullName = '',
  initialPhone = '',
  initialEmail = '',
  isLoggedIn = false,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const tenantPath = useTenantPath(slug)
  const [isPending, startTransition] = useTransition()
  const [fullName, setFullName] = useState(initialFullName)
  const [phone, setPhone] = useState(initialPhone)
  const [email, setEmail] = useState(initialEmail)
  const [focusedField, setFocusedField] = useState<'fullName' | 'phone' | 'email' | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ fullName?: string; phone?: string; email?: string }>({})
  const [submitError, setSubmitError] = useState('')

  const totalPrice = useMemo(
    () => services.reduce((total, service) => total + Number(service.price ?? 0), 0),
    [services]
  )
  const totalDuration = useMemo(
    () => services.reduce((total, service) => total + Number(service.duration_minutes ?? 0), 0),
    [services]
  )
  const formattedDate = formatBookingDate(date)

  function validate() {
    const nextErrors: { fullName?: string; phone?: string; email?: string } = {}

    if (!fullName.trim() || fullName.trim().length < 2) {
      nextErrors.fullName = 'Inserisci il tuo nome e cognome.'
    }

    if (!phone.trim() || phone.trim().length < 6) {
      nextErrors.phone = 'Inserisci un numero di telefono valido.'
    }

    if (email.trim().length > 0) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailPattern.test(email.trim())) {
        nextErrors.email = 'Inserisci un indirizzo email valido.'
      }
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
  }

  function handleConfirm() {
    setSubmitError('')
    if (!validate()) return
    startTransition(async () => {
      const result: CreateGuestBookingResult = await createGuestBooking({
        slug,
        tenantId,
        locationId,
        staffId,
        serviceIds: services.map((service) => service.id),
        date,
        time,
        fullName,
        phone,
        email,
        notes: '',
        marketingConsent: false,
      })

      if (!result.success || !result.appointmentId) {
        setSubmitError(result.error ?? 'Non siamo riusciti a confermare la prenotazione.')
        return
      }

      onSuccess(result.appointmentId)
    })
  }

  const profileLink = tenantPath('/profilo')

  return (
    <form onSubmit={handleSubmit} style={{ minHeight: '100vh', background: '#F5F5F0', paddingBottom: 0 }}>
      <BookingStepIndicator
        currentStep="confirm"
        completedSteps={skipLocationStep ? ['staff', 'service', 'datetime'] : ['location', 'staff', 'service', 'datetime']}
        tenantPrimary={brandColor}
        skipLocationStep={skipLocationStep}
        stickyTopOverride={76}
      />

      <div
        style={{
          margin: '12px 16px',
          borderRadius: 20,
          background: 'white',
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
          {staff.photo_url ? (
            <img
              src={staff.photo_url}
              alt={staff.full_name ?? 'Barbiere'}
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                objectFit: 'cover',
                display: 'block',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: `${brandColor}22`,
                color: brandColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {getInitials(staff.full_name)}
            </div>
          )}

          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111' }}>
              {staff.full_name ?? 'Barbiere'}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>
              Presso {location.name}
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: '#F0F0F0', margin: '0 16px' }} />

        <div style={{ padding: '12px 16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(0,0,0,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Servizi
          </p>
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {services.map((service) => (
              <div
                key={service.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{service.name}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  {formatCurrency(Number(service.price ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: '#F0F0F0', margin: '0 16px' }} />

        <div style={{ padding: '12px 16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(0,0,0,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Data e ora
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>
            {formattedDate} · {time}
          </p>
        </div>

        <div style={{ height: 1, background: '#F0F0F0', margin: '0 16px' }} />

        <div style={{ padding: '12px 16px' }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(0,0,0,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            Durata stimata
          </p>
          <p style={{ margin: '8px 0 0', fontSize: 14, fontWeight: 500, color: '#111' }}>
            {totalDuration} minuti
          </p>
        </div>

        <div style={{ height: 1, background: '#F0F0F0', margin: '0 16px' }} />

        <div
          style={{
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Totale</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: brandColor }}>
            {formatCurrency(totalPrice)}
          </span>
        </div>
      </div>

      {isLoggedIn ? (
        <>
          <div style={{ margin: 16 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: '#111' }}>I tuoi dati</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'white',
                  border: '1.5px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Nome e cognome</p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, color: '#111' }}>{fullName || '—'}</p>
                </div>
                <Link href={profileLink} style={{ fontSize: 13, color: brandColor, fontWeight: 600 }}>
                  modifica profilo
                </Link>
              </div>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'white',
                  border: '1.5px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Telefono</p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, color: '#111' }}>{phone || '—'}</p>
                </div>
                <Link href={profileLink} style={{ fontSize: 13, color: brandColor, fontWeight: 600 }}>
                  modifica profilo
                </Link>
              </div>
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: 'white',
                  border: '1.5px solid #E0E0E0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>Email</p>
                  <p style={{ margin: '4px 0 0', fontSize: 15, color: '#111' }}>{email || '—'}</p>
                </div>
                <Link href={profileLink} style={{ fontSize: 13, color: brandColor, fontWeight: 600 }}>
                  modifica profilo
                </Link>
              </div>
            </div>
          </div>
          <BottomCTA
            primary={{
              label: isPending ? 'Conferma in corso...' : 'Conferma prenotazione',
              onClick: handleConfirm,
              loading: isPending,
              disabled: isPending,
            }}
            tenantPrimary={brandColor}
          />
          {submitError ? (
            <p
              style={{
                position: 'fixed',
                bottom: 'calc(80px + max(12px, env(safe-area-inset-bottom, 0px)))',
                left: 16,
                right: 16,
                margin: 0,
                fontSize: 12,
                color: '#DC2626',
                textAlign: 'center',
                zIndex: 51,
              }}
            >
              {submitError}
            </p>
          ) : null}
        </>
      ) : (
        <BookingAuthStep
          slug={slug}
          tenantId={tenantId}
          locationId={locationId}
          staffId={staffId}
          serviceIds={services.map((s) => s.id)}
          date={date}
          time={time}
          primaryColor={primaryColor}
          onSuccess={onSuccess}
        />
      )}
    </form>
  )
}
