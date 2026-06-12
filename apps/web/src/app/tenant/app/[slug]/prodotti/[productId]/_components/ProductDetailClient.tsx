'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useCallback } from 'react'
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
} from 'lucide-react'
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
    Record<string, { added: boolean; loading: boolean; qty: number }>
  >(
    Object.fromEntries(
      upcomingAppointments.map((a) => [a.id, { added: a.hasProduct, loading: false, qty: 1 }]),
    ),
  )

  const [selectedApptId, setSelectedApptId] = useState<string | null>(
    upcomingAppointments[0]?.id ?? null,
  )

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
        quantity: state.qty,
        priceAtSale: priceSell,
      })
      setApptStates((prev) => ({
        ...prev,
        [appointmentId]: { ...prev[appointmentId], loading: false, added: result.success },
      }))
    },
    [apptStates, tenantId, productId, priceSell],
  )

  const changeQty = useCallback((appointmentId: string, delta: number) => {
    setApptStates((prev) => {
      const current = prev[appointmentId]
      if (!current) return prev
      return { ...prev, [appointmentId]: { ...current, qty: Math.max(1, current.qty + delta) } }
    })
  }, [])

  const favorited = isFavorite(productId)
  const selectedAppt = upcomingAppointments.find((a) => a.id === selectedApptId) ?? null
  const selectedState = selectedApptId
    ? (apptStates[selectedApptId] ?? { added: false, loading: false, qty: 1 })
    : null

  const TOP_OFFSET = 'calc(env(safe-area-inset-top, 0px) + 16px)'

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
        .detail-appt-chips::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .detail-panel { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Back — top-left Liquid Glass circle */}
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Torna indietro"
        style={{
          position: 'absolute',
          top: TOP_OFFSET,
          left: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.45)',
          background: 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 200ms',
        }}
      >
        <ArrowLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
      </button>

      {/* Heart — top-right Liquid Glass circle */}
      <button
        type="button"
        onClick={() => void toggle(productId)}
        aria-label={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        style={{
          position: 'absolute',
          top: TOP_OFFSET,
          right: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.45)',
          background: favorited ? `${brandColor}dd` : 'rgba(255,255,255,0.22)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 200ms',
        }}
      >
        <Heart size={18} color="#FFFFFF" fill={favorited ? '#FFFFFF' : 'none'} strokeWidth={2} />
      </button>

      {/* Liquid Glass panel */}
      <div
        className="detail-panel"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          maxHeight: '62dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          backdropFilter: 'blur(60px) saturate(240%)',
          WebkitBackdropFilter: 'blur(60px) saturate(240%)',
          background: 'rgba(255,255,255,0.28)',
          borderRadius: '28px 28px 0 0',
          borderTop: '1.5px solid rgba(255,255,255,0.6)',
          animationName: 'detail-panel-up',
          animationDuration: '360ms',
          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          animationFillMode: 'both',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2 }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: 'rgba(0,0,0,0.15)' }} />
        </div>

        <div style={{
          padding: '8px 20px calc(env(safe-area-inset-bottom, 12px) + 16px)',
          maxWidth: 640,
          margin: '0 auto',
        }}>

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

          {/* Name + Price */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0a0a0a', lineHeight: 1.15, margin: 0, flex: 1 }}>
              {productName}
            </h1>
            {priceSell > 0 && (
              <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--brand-primary, #222)', lineHeight: 1.15, flexShrink: 0, margin: 0 }}>
                {formatPrice(priceSell)}
              </p>
            )}
          </div>

          {/* Description */}
          {productDescription && (
            <p style={{ fontSize: 14, color: 'rgba(0,0,0,0.55)', lineHeight: 1.65, marginBottom: 16 }}>
              {productDescription}
            </p>
          )}

          {/* Appointment CTA — compact e-commerce row */}
          <div style={{
            background: 'rgba(255,255,255,0.38)',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.52)',
            padding: '12px 14px',
          }}>
            {!isLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ flex: 1, fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: 0 }}>
                  Accedi per aggiungere alla visita
                </p>
                <Link
                  href={tenantPath('/accesso?mode=login')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 16px',
                    borderRadius: 100,
                    background: 'var(--brand-primary, #222)',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Accedi
                  <ChevronRight size={13} />
                </Link>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ flex: 1, fontSize: 13, color: 'rgba(0,0,0,0.45)', margin: 0 }}>
                  Nessun appuntamento futuro
                </p>
                <Link
                  href={tenantPath('/prenota')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '8px 16px',
                    borderRadius: 100,
                    background: 'var(--brand-primary, #222)',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 600,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Prenota
                  <ChevronRight size={13} />
                </Link>
              </div>
            ) : (
              <>
                {/* Chip selector — only when multiple appointments */}
                {upcomingAppointments.length > 1 && (
                  <div
                    className="detail-appt-chips"
                    style={{
                      display: 'flex',
                      gap: 6,
                      overflowX: 'auto',
                      paddingBottom: 10,
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

                {/* Single action row */}
                {selectedAppt && selectedState && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Date + services */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111', margin: 0, textTransform: 'capitalize' }}>
                        {formatDate(selectedAppt.start_time)}
                      </p>
                      {selectedAppt.serviceNames.length > 0 && (
                        <p style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedAppt.serviceNames.join(' · ')}
                        </p>
                      )}
                    </div>

                    {/* Qty stepper — hidden when already added */}
                    {!selectedState.added && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        background: 'rgba(0,0,0,0.07)',
                        borderRadius: 100,
                        padding: '4px 6px',
                        flexShrink: 0,
                      }}>
                        <button
                          type="button"
                          onClick={() => changeQty(selectedAppt.id, -1)}
                          style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <Minus size={11} color="#555" />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#222', minWidth: 18, textAlign: 'center' }}>
                          {selectedState.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(selectedAppt.id, 1)}
                          style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        >
                          <Plus size={11} color="#555" />
                        </button>
                      </div>
                    )}

                    {/* Action button */}
                    {selectedState.added ? (
                      <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: '#F0FDF4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Check size={18} color="#16A34A" strokeWidth={2.5} />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void addToAppointment(selectedAppt.id)}
                        disabled={selectedState.loading}
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          border: 'none',
                          background: 'var(--brand-primary, #222)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: selectedState.loading ? 'not-allowed' : 'pointer',
                          opacity: selectedState.loading ? 0.7 : 1,
                          transition: 'opacity 150ms',
                          flexShrink: 0,
                        }}
                      >
                        {selectedState.loading
                          ? <Loader2 size={16} color="#fff" style={{ animation: 'detail-spin 1s linear infinite' }} />
                          : <CalendarPlus size={16} color="#fff" />
                        }
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
