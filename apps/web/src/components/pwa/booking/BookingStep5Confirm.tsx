'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { ArrowRight, Calendar, Clock, Loader2, MapPin, Scissors, ShoppingBag } from 'lucide-react'
import { BookingUpsellDrawer } from './BookingUpsellDrawer'
import BookingAuthModal from './BookingAuthModal'
import BookingSuccessModal from './BookingSuccessModal'
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

  const selectedProducts = useMemo(
    () => upsellProducts.filter((p) => selectedProductIds.includes(p.id)),
    [upsellProducts, selectedProductIds],
  )
  const totalProductsPrice = useMemo(
    () => selectedProducts.reduce((sum, p) => sum + Number(p.price_sell ?? 0), 0),
    [selectedProducts],
  )
  const grandTotal = totalPrice + totalProductsPrice
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
    <div className="min-h-screen" style={{ background: '#F2F2F7' }}>

      {/* Scrollable content */}
      <div className="pb-36 px-4 pt-6 flex flex-col gap-3">

        {/* ── HERO — Staff + Sede ─────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}08 100%)`,
            border: `1.5px solid ${brandColor}22`,
            boxShadow: `0 8px 32px ${brandColor}18`,
          }}
        >
          <div className="px-5 py-5 flex items-center gap-4">
            {/* Avatar with gradient ring */}
            <div
              className="shrink-0 rounded-full p-[3px]"
              style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}55)` }}
            >
              {staff.photo_url ? (
                <Image
                  src={staff.photo_url}
                  alt={staff.full_name ?? 'Barbiere'}
                  width={76}
                  height={76}
                  className="rounded-full object-cover w-[76px] h-[76px] block bg-white"
                />
              ) : (
                <div
                  className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-white text-[20px] font-black"
                  style={{ backgroundColor: brandColor }}
                >
                  {getInitials(staff.full_name)}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-gray-400 mb-0.5">
                Il tuo barbiere
              </p>
              <p
                className="text-[22px] font-black text-gray-900 leading-tight truncate"
                style={{ fontFamily: 'var(--font-tenant, inherit)' }}
              >
                {staff.full_name ?? 'Barbiere'}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                <p className="text-[13px] font-medium text-gray-500 truncate">{location.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── DATA + ORA — Due chip affiancati ────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {/* Data */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: brandColor }} />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">Data</p>
            </div>
            <p className="text-[15px] font-black text-gray-900 capitalize leading-snug">
              {formattedDate}
            </p>
          </div>

          {/* Ora + durata */}
          <div className="bg-white rounded-2xl px-4 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: brandColor }} />
              <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">Orario</p>
            </div>
            <p className="text-[28px] font-black text-gray-900 leading-none">{formattedTime}</p>
            <p className="text-[12px] text-gray-400 mt-1 font-medium">{totalDuration} min</p>
          </div>
        </div>

        {/* ── SERVIZI ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-2 px-5 pt-4 pb-3">
            <Scissors className="w-3.5 h-3.5 shrink-0" style={{ color: brandColor }} />
            <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">Servizi</p>
          </div>
          <div className="px-5 pb-4 flex flex-col">
            {services.map((service, i) => (
              <div
                key={service.id}
                className="flex items-center justify-between py-2.5"
                style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                  <p className="text-[15px] font-medium text-gray-900 truncate">{service.name}</p>
                </div>
                <p className="text-[15px] font-bold text-gray-900 ml-3 shrink-0">
                  € {Number(service.price ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── PRODOTTI AGGIUNTI (condizionale) ────────────────────── */}
        {selectedProducts.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0" style={{ color: brandColor }} />
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-gray-400">
                  Prodotti aggiunti
                </p>
              </div>
              <span
                className="text-[11px] font-bold text-white rounded-full px-2 py-0.5 leading-tight"
                style={{ backgroundColor: brandColor }}
              >
                {selectedProducts.length}
              </span>
            </div>
            <div className="px-5 pb-4 flex flex-col">
              {selectedProducts.map((product, i) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 py-2.5"
                  style={{ borderTop: i > 0 ? '1px solid #F3F4F6' : 'none' }}
                >
                  {/* Thumbnail o placeholder */}
                  {product.photo_url ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      width={44}
                      height={44}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 bg-gray-100"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center"
                      style={{ background: `${brandColor}12` }}
                    >
                      <ShoppingBag className="w-5 h-5" style={{ color: brandColor }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-gray-900 truncate">{product.name}</p>
                    {product.brand && (
                      <p className="text-[12px] text-gray-400 truncate">{product.brand}</p>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-gray-900 shrink-0">
                    € {Number(product.price_sell ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOTALE — Sfondo brand ────────────────────────────────── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}CC 100%)`,
            boxShadow: `0 8px 24px ${brandColor}44`,
          }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <p className="text-[14px] font-semibold text-white/75">Totale da pagare</p>
            <p className="text-[34px] font-black text-white leading-none tracking-tight">
              € {grandTotal.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <p className="text-center text-[11px] text-white/55 pb-4 px-4">
            Pagamento in sede al termine della visita
          </p>
        </div>

      </div>

      {/* ── CTA FIXED IN BASSO ──────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-[max(24px,env(safe-area-inset-bottom,0px))] pt-3 z-20"
           style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={handleConferma}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-[16px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}CC 100%)`,
            boxShadow: `0 4px 20px ${brandColor}44`,
          }}
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

      {/* Error modal */}
      {submitError && (
        <BookingSuccessModal
          type="error"
          primaryColor={brandColor}
          errorMessage={submitError}
          onRetry={() => setSubmitError('')}
        />
      )}

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
            productIds: selectedProductIds,
            date,
            time,
          }}
          prefillEmail={initialEmail}
          prefillFullName={initialFullName}
          prefillPhone={initialPhone}
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
