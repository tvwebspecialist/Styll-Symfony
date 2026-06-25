'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useCallback, useEffect } from 'react'
import {
  ArrowLeft,
  CalendarPlus,
  Check,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { FloatingCard } from '@/components/pwa/FloatingCard'
import { useFavoriteProducts } from '@/lib/hooks/use-favorite-products'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'
import { addProductToAppointment } from '@/lib/actions/wishlist'
import type { UpcomingAppointmentWithStatus } from '@/lib/actions/wishlist'

interface Props {
  productId: string
  productName: string
  productBrand: string | null
  productCategory: string | null
  productDescription: string | null
  isNew: boolean
  priceSell: number
  tenantId: string
  slug: string
  isLoggedIn: boolean
  clientId?: string | null
  initialIsFavorite: boolean
  upcomingAppointments: UpcomingAppointmentWithStatus[]
  brandColor: string
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(price)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

export function ProductDetailClient({
  productId,
  productName,
  productBrand,
  productCategory,
  productDescription,
  isNew,
  priceSell,
  tenantId,
  slug,
  isLoggedIn,
  clientId,
  initialIsFavorite,
  upcomingAppointments,
  brandColor,
}: Props) {
  const router = useRouter()
  const tenantPath = useTenantPath(slug)
  const { isFavorite, toggle } = useFavoriteProducts({
    isLoggedIn,
    clientId,
    tenantId,
    slug,
    initialIds: initialIsFavorite ? [productId] : [],
  })

  const [apptStates, setApptStates] = useState<
    Record<string, { added: boolean; loading: boolean }>
  >(
    Object.fromEntries(
      upcomingAppointments.map((a) => [a.id, { added: a.hasProduct, loading: false }]),
    ),
  )

  const [selectedApptId, setSelectedApptId] = useState<string | null>(
    upcomingAppointments[0]?.id ?? null,
  )
  const [qty, setQty] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const addToAppointment = useCallback(
    async (appointmentId: string) => {
      const state = apptStates[appointmentId]
      if (!state || state.added || state.loading) return
      setApptStates((prev) => ({
        ...prev,
        [appointmentId]: { ...prev[appointmentId], loading: true },
      }))
      const result = await addProductToAppointment({
        tenantId,
        appointmentId,
        productId,
        quantity: qty,
        priceAtSale: priceSell,
      })
      setApptStates((prev) => ({
        ...prev,
        [appointmentId]: { ...prev[appointmentId], loading: false, added: result.success },
      }))
    },
    [apptStates, tenantId, productId, priceSell, qty],
  )

  useEffect(() => {
    if (!isModalOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isModalOpen])

  const favorited = isFavorite(productId)
  const selectedAppt = upcomingAppointments.find((a) => a.id === selectedApptId) ?? null
  const selectedState = selectedApptId
    ? (apptStates[selectedApptId] ?? { added: false, loading: false })
    : null

  const TOP_OFFSET = 'calc(env(safe-area-inset-top, 0px) + 16px)'

  // Topbar-glass recipe applied to circular buttons
  const glassCircleBase = {
    width: 44,
    height: 44,
    borderRadius: '50%' as const,
    border: '1px solid rgba(255,255,255,0.62)',
    backdropFilter: 'blur(28px) saturate(210%)',
    WebkitBackdropFilter: 'blur(28px) saturate(210%)',
    boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.45), 0 1px 0 rgba(15,23,42,0.04), 0 8px 24px rgba(15,23,42,0.11)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'background 200ms',
  }

  return (
    <>
      <style>{`
        @keyframes detail-panel-up {
          from { transform: translateY(24px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes detail-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes modal-slide-up {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes modal-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .detail-appt-chips::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .detail-panel { animation: none !important; opacity: 1 !important; transform: none !important; }
          .detail-modal { animation: none !important; }
          .detail-modal-backdrop { animation: none !important; }
        }
      `}</style>

      {/* Back — topbar-glass circle */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Torna indietro"
        style={{
          position: 'absolute',
          top: TOP_OFFSET,
          left: 16,
          zIndex: 20,
          ...glassCircleBase,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.88), rgba(248,250,252,0.68)), rgba(250,251,253,0.72)',
        }}
      >
        <ArrowLeft size={18} color="#0a0a0a" strokeWidth={2.5} />
      </button>

      {/* Heart — topbar-glass circle */}
      <button
        type="button"
        onClick={() => void toggle(productId)}
        aria-label={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        style={{
          position: 'absolute',
          top: TOP_OFFSET,
          right: 16,
          zIndex: 20,
          ...glassCircleBase,
          background: favorited
            ? `${brandColor}dd`
            : 'linear-gradient(135deg, rgba(255,255,255,0.88), rgba(248,250,252,0.68)), rgba(250,251,253,0.72)',
        }}
      >
        <Heart
          size={18}
          color={favorited ? '#FFFFFF' : '#0a0a0a'}
          fill={favorited ? '#FFFFFF' : 'none'}
          strokeWidth={2}
        />
      </button>

      {/* Info panel — FloatingCard */}
      <FloatingCard
        className="detail-panel"
        style={{
          position: 'fixed',
          bottom: 16,
          left: 16,
          right: 16,
          margin: 0,
          zIndex: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          padding: `24px 24px max(env(safe-area-inset-bottom, 0px), 24px)`,
          animationName: 'detail-panel-up',
          animationDuration: '360ms',
          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          animationFillMode: 'both',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 16px' }} />

        {/* Badges */}
        {(isNew || productCategory) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            {isNew && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 100,
                background: '#111',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}>
                <Sparkles size={10} />
                Novità
              </span>
            )}
            {productCategory && (
              <span style={{
                display: 'inline-block',
                padding: '3px 10px',
                borderRadius: 100,
                background: `${brandColor}22`,
                color: brandColor,
                fontSize: 11,
                fontWeight: 600,
              }}>
                {productCategory}
              </span>
            )}
          </div>
        )}

        {/* Brand */}
        {productBrand && (
          <p style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(0,0,0,0.45)',
            textTransform: 'uppercase',
            letterSpacing: '0.09em',
            marginBottom: 4,
          }}>
            {productBrand}
          </p>
        )}

        {/* Title */}
        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: '#0a0a0a',
          lineHeight: 1.15,
          margin: '0 0 10px',
        }}>
          {productName}
        </h1>

        {/* Description */}
        {productDescription && (
          <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', lineHeight: 1.65, marginBottom: 0 }}>
            {productDescription}
          </p>
        )}

        {/* Price + qty stepper + action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          {priceSell > 0 && (
            <p style={{ fontSize: 22, fontWeight: 800, color: '#0a0a0a', margin: 0, flexShrink: 0 }}>
              {formatPrice(priceSell)}
            </p>
          )}

          <div style={{ flex: 1 }} />

          {/* Qty stepper pill */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 100,
            padding: '5px 6px',
            flexShrink: 0,
          }}>
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <Minus size={12} color="#444" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#222', minWidth: 20, textAlign: 'center' }}>
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              <Plus size={12} color="#444" />
            </button>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            aria-label="Aggiungi alla visita"
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              border: 'none',
              background: 'var(--brand-primary, #222)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(0,0,0,0.22)',
            }}
          >
            <CalendarPlus size={20} color="#fff" />
          </button>
        </div>
      </FloatingCard>

      {/* Modal */}
      {isModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className="detail-modal-backdrop"
            onClick={() => setIsModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(0,0,0,0.4)',
              animation: 'modal-fade-in 200ms ease both',
            }}
          />

          {/* Bottom sheet */}
          <div
            className="detail-modal"
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 51,
              maxHeight: '80dvh',
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(40px) saturate(180%)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              borderRadius: '28px 28px 0 0',
              borderTop: '1.5px solid rgba(255,255,255,0.8)',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              animation: 'modal-slide-up 300ms cubic-bezier(0.22,1,0.36,1) both',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 100, background: 'rgba(0,0,0,0.15)' }} />
            </div>

            <div style={{
              padding: '8px 20px calc(env(safe-area-inset-bottom, 12px) + 20px)',
              maxWidth: 640,
              margin: '0 auto',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', margin: 0 }}>
                  Aggiungi alla visita
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.07)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <X size={16} color="#444" />
                </button>
              </div>

              {/* State: not logged in */}
              {!isLoggedIn ? (
                <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                  <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.5)', marginBottom: 20, lineHeight: 1.6 }}>
                    Accedi per aggiungere questo prodotto alla tua visita.
                  </p>
                  <Link
                    href={tenantPath('/accesso?mode=login')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '12px 24px',
                      borderRadius: 100,
                      background: 'var(--brand-primary, #222)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Accedi
                    <ChevronRight size={14} />
                  </Link>
                </div>

              ) : upcomingAppointments.length === 0 ? (
                /* State: no upcoming appointments */
                <div style={{ textAlign: 'center', padding: '8px 0 8px' }}>
                  <div style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: `${brandColor}18`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <CalendarPlus size={24} color={brandColor} />
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#0a0a0a', marginBottom: 6 }}>
                    Nessuna visita in programma
                  </p>
                  <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', marginBottom: 24, lineHeight: 1.65 }}>
                    Prenota un appuntamento per poter aggiungere questo prodotto alla tua visita.
                  </p>
                  <Link
                    href={tenantPath('/prenota')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '12px 24px',
                      borderRadius: 100,
                      background: 'var(--brand-primary, #222)',
                      color: '#FFFFFF',
                      fontSize: 14,
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    Prenota ora
                    <ChevronRight size={14} />
                  </Link>
                </div>

              ) : (
                /* State: has upcoming appointments */
                <>
                  {/* Chip selector — only when multiple appointments */}
                  {upcomingAppointments.length > 1 && (
                    <div
                      className="detail-appt-chips"
                      style={{
                        display: 'flex',
                        gap: 6,
                        overflowX: 'auto',
                        paddingBottom: 14,
                        scrollbarWidth: 'none',
                      }}
                    >
                      {upcomingAppointments.map((appt) => {
                        const isSelected = selectedApptId === appt.id
                        return (
                          <button
                            key={appt.id}
                            type="button"
                            onClick={() => setSelectedApptId(appt.id)}
                            style={{
                              flexShrink: 0,
                              padding: '5px 12px',
                              borderRadius: 100,
                              border: `1.5px solid ${isSelected ? brandColor : 'rgba(0,0,0,0.12)'}`,
                              background: isSelected ? `${brandColor}18` : 'transparent',
                              color: isSelected ? brandColor : 'rgba(0,0,0,0.4)',
                              fontSize: 11,
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                            }}
                          >
                            {formatDateShort(appt.start_time)}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Selected appointment info + add button */}
                  {selectedAppt && selectedState && (
                    <div>
                      <div style={{ marginBottom: 16 }}>
                        <p style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: '#111',
                          margin: '0 0 3px',
                          textTransform: 'capitalize',
                        }}>
                          {formatDate(selectedAppt.start_time)}
                        </p>
                        {selectedAppt.serviceNames.length > 0 && (
                          <p style={{ fontSize: 12, color: 'rgba(0,0,0,0.38)', margin: 0 }}>
                            {selectedAppt.serviceNames.join(' · ')}
                          </p>
                        )}
                      </div>

                      {selectedState.added ? (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '12px 16px',
                          borderRadius: 14,
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                        }}>
                          <Check size={18} color="#16A34A" strokeWidth={2.5} />
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#15803D', margin: 0 }}>
                            Prodotto aggiunto alla visita
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void addToAppointment(selectedAppt.id)}
                          disabled={selectedState.loading}
                          style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: 100,
                            border: 'none',
                            background: 'var(--brand-primary, #222)',
                            color: '#FFFFFF',
                            fontSize: 15,
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            cursor: selectedState.loading ? 'not-allowed' : 'pointer',
                            opacity: selectedState.loading ? 0.7 : 1,
                            transition: 'opacity 150ms',
                            fontFamily: 'inherit',
                          }}
                        >
                          {selectedState.loading ? (
                            <Loader2 size={18} color="#fff" style={{ animation: 'detail-spin 1s linear infinite' }} />
                          ) : (
                            <>
                              <CalendarPlus size={18} color="#fff" />
                              {qty > 1
                                ? `Aggiungi ${qty}× — ${formatPrice(priceSell * qty)}`
                                : `Aggiungi — ${formatPrice(priceSell)}`
                              }
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
