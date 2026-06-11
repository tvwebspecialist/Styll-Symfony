'use client'

import Link from 'next/link'
import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Calendar,
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

export interface LocationStock {
  id: string
  name: string
  available: boolean
}

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
  locationStocks: LocationStock[]
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
  locationStocks,
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

  const addToAppointment = useCallback(
    async (appointmentId: string) => {
      const state = apptStates[appointmentId]
      if (!state || state.added || state.loading) return
      setApptStates((prev) => ({ ...prev, [appointmentId]: { ...prev[appointmentId], loading: true } }))
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
        @media (prefers-reduced-motion: reduce) {
          .detail-panel { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* Back — top-left frosted pill */}
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          left: 16,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px 8px 10px',
          borderRadius: 100,
          border: 'none',
          background: 'rgba(0,0,0,0.48)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          color: '#FFFFFF',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        <ArrowLeft size={16} color="#FFFFFF" />
        Prodotti
      </button>

      {/* Heart — top-right frosted circle */}
      <button
        type="button"
        onClick={() => void toggle(productId)}
        aria-label={favorited ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
        style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 16,
          zIndex: 20,
          width: 44,
          height: 44,
          borderRadius: '50%',
          border: 'none',
          background: favorited ? 'var(--brand-primary, #222)' : 'rgba(0,0,0,0.48)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 200ms',
        }}
      >
        <Heart
          size={18}
          color="#FFFFFF"
          fill={favorited ? '#FFFFFF' : 'none'}
          strokeWidth={2}
        />
      </button>

      {/* Glass panel — emerges from bottom */}
      <div
        className="detail-panel"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          maxHeight: '68dvh',
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          background: 'rgba(255,255,255,0.93)',
          borderRadius: '30px 30px 0 0',
          animationName: 'detail-panel-up',
          animationDuration: '360ms',
          animationTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          animationFillMode: 'both',
        }}
      >
        {/* Drag handle indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 100, background: 'rgba(0,0,0,0.10)' }} />
        </div>

        <div style={{
          padding: '16px 20px calc(env(safe-area-inset-bottom, 16px) + 28px)',
          maxWidth: 640,
          margin: '0 auto',
        }}>

          {/* Badges row: isNew + category */}
          {(isNew || productCategory) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
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
                  background: `${brandColor}1a`,
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
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.09em',
              marginBottom: 6,
            }}>
              {productBrand}
            </p>
          )}

          {/* Name + Price */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
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
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.65, marginBottom: 20 }}>
              {productDescription}
            </p>
          )}

          {/* Location availability */}
          {locationStocks.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#B0B0B0', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                Disponibilità per sede
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {locationStocks.map((loc) => (
                  <div
                    key={loc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f5f5f5',
                      borderRadius: 12,
                    }}
                  >
                    <p style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{loc.name}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: loc.available ? '#22C55E' : '#D1D5DB' }} />
                      <span style={{ fontSize: 12, color: loc.available ? '#16A34A' : '#9CA3AF', fontWeight: 500 }}>
                        {loc.available ? 'Disponibile' : 'Non disponibile'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointment section */}
          <div style={{ background: '#f5f5f5', borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={15} color={brandColor} />
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                  Usa questo prodotto alla prossima visita
                </p>
              </div>
              <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, paddingLeft: 23 }}>
                Il barbiere lo preparerà per te
              </p>
            </div>

            {!isLoggedIn ? (
              <div style={{ padding: '12px 16px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
                  Accedi per associare il prodotto al tuo appuntamento
                </p>
                <Link
                  href={tenantPath('/accesso?mode=login')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    borderRadius: 100,
                    background: 'var(--brand-primary, #222)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Accedi
                  <ChevronRight size={14} />
                </Link>
              </div>
            ) : upcomingAppointments.length === 0 ? (
              <div style={{ padding: '12px 16px 16px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
                  Non hai appuntamenti futuri
                </p>
                <Link
                  href={tenantPath('/prenota')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 20px',
                    borderRadius: 100,
                    background: 'var(--brand-primary, #222)',
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Prenota ora
                  <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                {upcomingAppointments.map((appt, idx) => {
                  const state = apptStates[appt.id] ?? { added: appt.hasProduct, loading: false, qty: 1 }
                  return (
                    <div
                      key={appt.id}
                      style={{
                        padding: '12px 16px',
                        borderTop: idx === 0 ? 'none' : '1px solid rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#111', textTransform: 'capitalize' }}>
                          {formatDate(appt.start_time)}
                        </p>
                        {appt.serviceNames.length > 0 && (
                          <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {appt.serviceNames.join(' · ')}
                          </p>
                        )}
                      </div>

                      {!state.added && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.08)', borderRadius: 100, padding: '3px 6px', flexShrink: 0 }}>
                          <button type="button" onClick={() => changeQty(appt.id, -1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <Minus size={12} color="#555" />
                          </button>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#222', minWidth: 16, textAlign: 'center' }}>
                            {state.qty}
                          </span>
                          <button type="button" onClick={() => changeQty(appt.id, 1)} style={{ width: 24, height: 24, border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                            <Plus size={12} color="#555" />
                          </button>
                        </div>
                      )}

                      {state.added ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 100, background: '#F0FDF4', fontSize: 12, fontWeight: 600, color: '#16A34A', flexShrink: 0 }}>
                          <Check size={13} color="#16A34A" strokeWidth={2.5} />
                          Aggiunto
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void addToAppointment(appt.id)}
                          disabled={state.loading}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '7px 14px',
                            borderRadius: 100,
                            border: 'none',
                            background: 'var(--brand-primary, #222)',
                            color: '#FFFFFF',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: state.loading ? 'not-allowed' : 'pointer',
                            opacity: state.loading ? 0.7 : 1,
                            transition: 'opacity 150ms',
                            flexShrink: 0,
                            fontFamily: 'inherit',
                          }}
                        >
                          {state.loading
                            ? <Loader2 size={13} style={{ animation: 'detail-spin 1s linear infinite' }} />
                            : <Plus size={13} />
                          }
                          {!state.loading && 'Aggiungi'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  )
}
