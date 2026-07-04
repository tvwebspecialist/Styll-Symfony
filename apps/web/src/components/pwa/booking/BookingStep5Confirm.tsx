'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { Calendar, Clock, Loader2, MapPin, Scissors, ShoppingBag } from 'lucide-react'
import { BookingUpsellDrawer } from './BookingUpsellDrawer'
import BookingAuthModal from './BookingAuthModal'
import BookingSuccessModal from './BookingSuccessModal'
import { createGuestBooking } from '@/lib/actions/create-booking'
import { getUpsellProductsAction } from '@/lib/actions/upsell-action'
import { trackEvent, getCurrentAnonymousId } from '@/lib/site-analytics/track'
import { linkSessionToClient } from '@/lib/site-analytics/link-session'
import type { PublicLocation, PublicService, PublicStaffMember, UpsellProduct } from '@/lib/actions/public-booking'
import { useToast } from '@/components/pwa/ui/Toast'
import { applyBestPromotion, type PromotionServicePricing } from '@/lib/utils/offer-pricing'

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
  onAuthComplete?: () => void
  primaryColor?: string
  logoUrl?: string | null
  businessName?: string
  skipLocationStep?: boolean
  initialFullName?: string
  initialPhone?: string
  initialEmail?: string
  isLoggedIn?: boolean
  clientId?: string
  googleLogin?: boolean
  rescheduleFromId?: string
  offersByServiceId?: Record<string, PromotionServicePricing[]>
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
  offersByServiceId = {},
  date,
  time,
  onBack: _onBack,
  onSuccess,
  onAuthComplete,
  primaryColor,
  logoUrl,
  businessName,
  initialFullName = '',
  initialPhone = '',
  initialEmail = '',
  isLoggedIn = false,
  clientId,
  googleLogin = false,
  rescheduleFromId,
}: Props) {
  const brandColor = primaryColor ?? '#1a1a1a'
  const { showToast } = useToast()

  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [phone, setPhone] = useState(initialPhone ?? '')
  const [phoneError, setPhoneError] = useState('')

  const [upsellProducts, setUpsellProducts] = useState<UpsellProduct[]>([])
  const [loadingUpsell, setLoadingUpsell] = useState(true)
  const [upsellDone, setUpsellDone] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('booking_upsell_ids')
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    const categories = services.map((s) => s.category).filter((c): c is string => Boolean(c))
    getUpsellProductsAction({
      tenantId,
      locationId,
      serviceCategories: categories,
      clientId: clientId ?? undefined,
      limit: 4,
    })
      .then((products) => {
        setUpsellProducts(products)
        if (products.length === 0) {
          setUpsellDone(true)
        } else if (sessionStorage.getItem('upsell_shown') === '1') {
          setUpsellDone(true)
        } else {
          sessionStorage.setItem('upsell_shown', '1')
        }
      })
      .catch(() => setUpsellDone(true))
      .finally(() => setLoadingUpsell(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    trackEvent({ tenantId, eventType: 'booking_started' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!googleLogin) return
    const t = setTimeout(() => {
      showToast({
        type: 'success',
        title: 'Accesso effettuato',
        subtitle: 'Hai effettuato l\'accesso con Google',
      })
    }, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalPrice = useMemo(
    () => services.reduce((total, service) => {
      const items = offersByServiceId[service.id] ?? []
      const { discountedPrice } = applyBestPromotion(Number(service.price ?? 0), items)
      return total + discountedPrice
    }, 0),
    [services, offersByServiceId],
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
      rescheduleFromId,
    })
    if (!result.success || !result.appointmentId) {
      setSubmitError(result.error ?? 'Non siamo riusciti a confermare la prenotazione.')
      setIsSubmitting(false)
      return
    }
    trackEvent({ tenantId, eventType: 'booking_completed' })
    if (result.clientId) {
      const anonymousId = getCurrentAnonymousId()
      linkSessionToClient(tenantId, anonymousId, result.clientId).catch(() => {})
    }
    sessionStorage.removeItem('booking_upsell_ids')
    sessionStorage.removeItem('upsell_shown')
    onSuccess(result.appointmentId)
  }

  async function handleConferma() {
    if (!isLoggedIn) {
      setShowAuthModal(true)
      return
    }
    if (!phone || phone.trim().length < 6) {
      setPhoneError('Inserisci un numero di telefono valido')
      return
    }
    setPhoneError('')
    await submitBooking({
      fullName: initialFullName ?? '',
      phone: phone.trim(),
      email: initialEmail ?? '',
    })
  }

  const needsPhone = isLoggedIn && (!initialPhone || initialPhone.trim() === '')
  const phoneValid = phone.trim().length >= 6
  const isDisabled = isSubmitting || (needsPhone && !phoneValid)

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>

      {/* Scrollable content */}
      <div style={{
        padding: 16,
        paddingBottom: 'calc(80px + max(8px, env(safe-area-inset-bottom, 0px)))',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>

        {/* ── HERO — foto barbiere + FloatingCard overlay ─────────── */}
        <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', aspectRatio: '4/3', background: `${brandColor}12` }}>
          {staff.photo_url ? (
            <Image
              src={staff.photo_url}
              alt={staff.full_name ?? 'Barbiere'}
              fill
              sizes="100vw"
              style={{ objectFit: 'cover' }}
              priority
            />
          ) : (
            <div style={{
              width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${brandColor}22, ${brandColor}0a)`,
            }}>
              <span style={{ fontSize: 56, fontWeight: 900, color: brandColor, opacity: 0.3 }}>
                {getInitials(staff.full_name)}
              </span>
            </div>
          )}

          {/* Mini FloatingCard bianca */}
          <div style={{
            position: 'absolute', bottom: 10, left: 10, right: 10,
            background: 'white', borderRadius: 18, padding: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#222222', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {staff.full_name ?? 'Barbiere'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <MapPin size={12} color="#71717A" style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 14, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {location.name}
              </p>
            </div>
          </div>
        </div>

        {/* ── DATA + ORA ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Calendar size={14} color={brandColor} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA' }}>Data</p>
            </div>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1.25, textTransform: 'capitalize' }}>
              {formattedDate}
            </p>
          </div>

          <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <Clock size={14} color={brandColor} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA' }}>Orario</p>
            </div>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: '#111827', lineHeight: 1 }}>{formattedTime}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A1A1AA', fontWeight: 500 }}>{totalDuration} min</p>
          </div>
        </div>

        {/* ── SERVIZI ──────────────────────────────────────────────── */}
        <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Scissors size={14} color={brandColor} style={{ flexShrink: 0 }} />
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA' }}>Servizi</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {services.map((service, i) => {
              const items = offersByServiceId[service.id] ?? []
              const { discountedPrice, appliedPromotionId } = applyBestPromotion(Number(service.price ?? 0), items)
              const hasDiscount = appliedPromotionId !== null
              return (
                <div
                  key={service.id}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0,
                    borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {service.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    {hasDiscount && (
                      <p style={{ margin: 0, fontSize: 13, color: '#A1A1AA', textDecoration: 'line-through' }}>
                        €{Number(service.price ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                      </p>
                    )}
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: hasDiscount ? '#16A34A' : '#111827' }}>
                      €{discountedPrice.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── PRODOTTI AGGIUNTI (condizionale) ─────────────────────── */}
        {selectedProducts.length > 0 && (
          <div style={{ background: 'white', borderRadius: 28, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShoppingBag size={14} color={brandColor} style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#A1A1AA' }}>Prodotti aggiunti</p>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'white', backgroundColor: brandColor, borderRadius: 999, padding: '2px 8px', lineHeight: 1.5 }}>
                {selectedProducts.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {selectedProducts.map((product, i) => (
                <div
                  key={product.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    paddingTop: i > 0 ? 10 : 0, marginTop: i > 0 ? 10 : 0,
                    borderTop: i > 0 ? '1px solid #F3F4F6' : 'none',
                  }}
                >
                  {product.photo_url ? (
                    <Image
                      src={product.photo_url}
                      alt={product.name}
                      width={44}
                      height={44}
                      style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0, background: '#f3f4f6' }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${brandColor}12` }}>
                      <ShoppingBag size={20} color={brandColor} />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
                    {product.brand && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A1A1AA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.brand}</p>}
                  </div>
                  <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827', flexShrink: 0 }}>
                    €{Number(product.price_sell ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TOTALE ───────────────────────────────────────────────── */}
        <div style={{ borderRadius: 28, padding: 20, background: brandColor }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.75)' }}>Totale da pagare</p>
            <p style={{ margin: 0, fontSize: 34, fontWeight: 900, color: 'white', lineHeight: 1, letterSpacing: '-0.02em' }}>
              €{grandTotal.toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </p>
          </div>
          <p style={{ margin: '8px 0 0', textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
            Pagamento in sede al termine della visita
          </p>
        </div>

        {/* ── PHONE INPUT (se necessario) ──────────────────────────── */}
        {needsPhone && (
          <div>
            <p style={{ margin: '0 0 8px 4px', fontSize: 12, fontWeight: 500, color: '#6B7280' }}>
              Per completare la prenotazione inserisci il tuo numero di telefono
            </p>
            <input
              type="tel"
              placeholder="+39 333 123 4567"
              value={phone}
              onChange={(e) => { setPhone(e.target.value); setPhoneError('') }}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '12px 16px', borderRadius: 18, fontSize: 15, fontWeight: 500,
                color: '#111827', background: 'white',
                border: `1.5px solid ${phoneError ? '#EF4444' : 'rgba(0,0,0,0.12)'}`,
                boxShadow: phoneError ? '0 0 0 2px rgba(239,68,68,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                outline: 'none',
              }}
            />
            {phoneError && (
              <p style={{ margin: '6px 0 0 4px', fontSize: 12, fontWeight: 500, color: '#EF4444' }}>{phoneError}</p>
            )}
          </div>
        )}

      </div>

      {/* ── CTA PILL FIXED ───────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleConferma}
        disabled={isDisabled}
        style={{
          position: 'fixed',
          bottom: 'max(8px, env(safe-area-inset-bottom, 8px))',
          left: 8,
          right: 8,
          zIndex: 50,
          height: 56,
          borderRadius: 44,
          background: brandColor,
          color: 'white',
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          cursor: isDisabled ? 'default' : 'pointer',
          opacity: isDisabled ? 0.45 : 1,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          transition: 'opacity 200ms',
          WebkitTapHighlightColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {isSubmitting ? (
          <Loader2 size={20} style={{ animation: 'step5Spin 0.75s linear infinite', flexShrink: 0 }} />
        ) : needsPhone && !phoneValid ? (
          <span>Inserisci il numero per continuare</span>
        ) : (
          <span>Conferma prenotazione</span>
        )}
      </button>

      <style>{`@keyframes step5Spin { to { transform: rotate(360deg); } }`}</style>

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
          logoUrl={logoUrl ?? undefined}
          businessName={businessName}
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
            onAuthComplete?.()
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
            sessionStorage.setItem('booking_upsell_ids', JSON.stringify(ids))
            setUpsellDone(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          onSkip={() => {
            setSelectedProductIds([])
            sessionStorage.removeItem('booking_upsell_ids')
            setUpsellDone(true)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

    </div>
  )
}
