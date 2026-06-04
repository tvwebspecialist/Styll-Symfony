'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, Calendar, Clock, Loader2, MapPin, Scissors } from 'lucide-react'
import { BookingUpsellDrawer } from './BookingUpsellDrawer'
import BookingAuthModal from './BookingAuthModal'
import { createGuestBooking } from '@/lib/actions/create-booking'
import { getUpsellProductsAction } from '@/lib/actions/upsell-action'
import type { PublicLocation, PublicService, PublicStaffMember, UpsellProduct } from '@/lib/actions/public-booking'

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
  clientId?: string
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
  onBack: _onBack,
  onSuccess,
  primaryColor,
  initialFullName = '',
  initialPhone = '',
  initialEmail = '',
  isLoggedIn = false,
  clientId,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([])
  const [loadingUpsell, setLoadingUpsell] = useState(true)
  const [upsellDone, setUpsellDone] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])

  useEffect(() => {
    const categories = services.map((s) => s.category).filter((c): c is string => Boolean(c))
    getUpsellProductsAction({
      tenantId,
      locationId,
      serviceCategories: categories,
      clientId: clientId ?? undefined,
      limit: 6,
    })
      .then((products) => {
        setUpsellProducts(products)
        if (products.length === 0) setUpsellDone(true)
      })
      .catch(() => setUpsellDone(true))
      .finally(() => setLoadingUpsell(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPrice = useMemo(
    () => services.reduce((total, service) => total + Number(service.price ?? 0), 0),
    [services],
  )
  const totalDuration = useMemo(
    () => services.reduce((total, service) => total + Number(service.duration_minutes ?? 0), 0),
    [services],
  )
  const formattedDate = formatBookingDate(date)
  const formattedTime = time.slice(0, 5)

  async function submitBooking(contactData: { fullName: string; phone: string; email: string }) {
    setIsSubmitting(true)
    setSubmitError('')
    const result = await createGuestBooking({
      slug,
      tenantId,
      locationId,
      staffId,
      serviceIds: services.map((s) => s.id),
      date,
      time,
      fullName: contactData.fullName,
      phone: contactData.phone,
      email: contactData.email,
      notes: '',
      marketingConsent: false,
      productIds: selectedProductIds,
    })
    if (!result.success || !result.appointmentId) {
      setSubmitError(result.error ?? 'Non siamo riusciti a confermare la prenotazione.')
      setIsSubmitting(false)
      return
    }
    onSuccess(result.appointmentId)
  }

  async function handleConferma() {
    if (!isLoggedIn) {
      setShowAuthModal(true)
      return
    }
    await submitBooking({
      fullName: initialFullName,
      phone: initialPhone ?? '',
      email: initialEmail ?? '',
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Scrollable content — pb-28 keeps it clear of the fixed CTA */}
      <div className="pb-28 px-4 py-5 flex flex-col gap-4">

        {/* CARD RIEPILOGO */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">

          {/* Staff — sfondo tinto con brand color */}
          <div
            className="flex items-center gap-4 px-5 py-5"
            style={{ background: `${brandColor}08` }}
          >
            {staff.photo_url ? (
              <Image
                src={staff.photo_url}
                alt={staff.full_name ?? 'Barbiere'}
                width={48}
                height={48}
                className="rounded-full object-cover w-12 h-12 shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-[15px] font-bold shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {getInitials(staff.full_name)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="text-[20px] font-bold text-gray-900 leading-tight truncate"
                style={{ fontFamily: 'var(--font-tenant, inherit)' }}
              >
                {staff.full_name ?? 'Barbiere'}
              </p>
              <p className="text-[13px] text-gray-400 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {location.name}
              </p>
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Servizi */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Scissors className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Servizi
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {services.map((service) => (
                <div key={service.id} className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-gray-900">{service.name}</p>
                  <p className="text-[15px] font-semibold text-gray-900">
                    {Number(service.price ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })} €
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Data e ora */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Data e ora
              </p>
            </div>
            <p className="text-[15px] font-medium text-gray-900 capitalize">
              {formattedDate} · {formattedTime}
            </p>
          </div>

          <div className="h-px bg-gray-100 mx-5" />

          {/* Durata */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3 h-3 text-gray-400 shrink-0" />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                Durata stimata
              </p>
            </div>
            <p className="text-[15px] font-medium text-gray-900">{totalDuration} minuti</p>
          </div>

          {/* Totale — border-top tinted con brand color */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderTop: `1.5px solid ${brandColor}20` }}
          >
            <p className="text-[16px] font-bold text-gray-900">Totale</p>
            <p className="text-[22px] font-bold" style={{ color: brandColor }}>
              {totalPrice.toLocaleString('it-IT', { minimumFractionDigits: 0 })} €
            </p>
          </div>

        </div>

        {/* Nota pagamento */}
        <p className="text-center text-[12px] text-gray-400 px-4">
          Il pagamento avviene in sede al termine della visita.
        </p>

      </div>

      {/* CTA FIXED IN BASSO */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[max(32px,env(safe-area-inset-bottom,0px))] pt-3 bg-white border-t border-gray-100 z-20">
        {submitError && (
          <p className="text-center text-[12px] text-red-500 mb-2">{submitError}</p>
        )}
        <button
          onClick={handleConferma}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Conferma prenotazione</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Auth modal */}
      {showAuthModal && (
        <BookingAuthModal
          primaryColor={brandColor}
          tenantId={tenantId}
          tenantSlug={slug}
          pendingBookingData={{
            slug,
            locationId,
            staffId,
            serviceIds: services.map((s) => s.id),
            date,
            time,
          }}
          onSuccess={async (contactData) => {
            setShowAuthModal(false)
            await submitBooking(contactData)
          }}
          onGuestContinue={async (guestData) => {
            setShowAuthModal(false)
            await submitBooking(guestData)
          }}
          onDismiss={() => setShowAuthModal(false)}
        />
      )}

      {/* Upsell drawer */}
      {!loadingUpsell && !upsellDone && upsellProducts.length > 0 && (
        <BookingUpsellDrawer
          products={upsellProducts}
          primaryColor={brandColor}
          staffName={staff.full_name}
          isLoggedIn={isLoggedIn}
          clientId={clientId}
          tenantId={tenantId}
          onContinue={(ids) => {
            setSelectedProductIds(ids)
            setUpsellDone(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onSkip={() => {
            setSelectedProductIds([])
            setUpsellDone(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

    </div>
  )
}
