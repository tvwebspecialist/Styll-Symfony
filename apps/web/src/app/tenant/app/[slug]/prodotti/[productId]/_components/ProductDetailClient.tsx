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
  Plus,
  Minus,
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
  priceSell: number
  tenantId: string
  slug: string
  isLoggedIn: boolean
  clientId?: string | null
  initialIsFavorite: boolean
  locationStocks: LocationStock[]
  upcomingAppointments: UpcomingAppointmentWithStatus[]
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
  priceSell,
  tenantId,
  slug,
  isLoggedIn,
  clientId,
  initialIsFavorite,
  locationStocks,
  upcomingAppointments,
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
      upcomingAppointments.map((a) => [
        a.id,
        { added: a.hasProduct, loading: false, qty: 1 },
      ]),
    ),
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
        [appointmentId]: {
          ...prev[appointmentId],
          loading: false,
          added: result.success,
        },
      }))
    },
    [apptStates, tenantId, productId, priceSell],
  )

  const changeQty = useCallback((appointmentId: string, delta: number) => {
    setApptStates((prev) => {
      const current = prev[appointmentId]
      if (!current) return prev
      const next = Math.max(1, current.qty + delta)
      return { ...prev, [appointmentId]: { ...current, qty: next } }
    })
  }, [])

  return (
    <>
      {/* Back button */}
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          padding: '0 0 16px 0',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 500,
          color: '#555',
        }}
      >
        <ArrowLeft size={18} color="#555" />
        Prodotti
      </button>

      {/* Favorites toggle — floats over hero */}
      <div style={{ position: 'absolute', top: 80, right: 20, zIndex: 10 }}>
        <button
          type="button"
          onClick={() => void toggle(productId)}
          aria-label={isFavorite(productId) ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: 'none',
            background: isFavorite(productId) ? 'var(--brand-primary, #222)' : 'rgba(255,255,255,0.92)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 180ms',
          }}
        >
          <Heart
            size={18}
            color={isFavorite(productId) ? '#FFFFFF' : 'var(--brand-primary, #222)'}
            fill={isFavorite(productId) ? '#FFFFFF' : 'none'}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* Per-location availability */}
      {locationStocks.length > 0 && (
        <div
          style={{
            marginTop: 20,
            background: '#FFFFFF',
            borderRadius: 18,
            border: '1px solid #F0F0F0',
            overflow: 'hidden',
          }}
        >
          <p
            style={{
              padding: '14px 16px 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#B0B0B0',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}
          >
            Disponibilità per sede
          </p>
          {locationStocks.map((loc, idx) => (
            <div
              key={loc.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '11px 16px',
                borderTop: idx === 0 ? 'none' : '1px solid #F5F5F5',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 500, color: '#333' }}>{loc.name}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: loc.available ? '#22C55E' : '#D1D5DB',
                  }}
                />
                <span
                  style={{
                    fontSize: 12,
                    color: loc.available ? '#16A34A' : '#9CA3AF',
                    fontWeight: 500,
                  }}
                >
                  {loc.available ? 'Disponibile' : 'Non disponibile'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Appointment association block */}
      <div
        style={{
          marginTop: 20,
          background: '#FFFFFF',
          borderRadius: 18,
          border: '1px solid #F0F0F0',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px 12px',
            borderBottom: '1px solid #F5F5F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={16} color="var(--brand-primary, #222)" />
            <p
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#222',
              }}
            >
              Usa questo prodotto alla prossima visita
            </p>
          </div>
          <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, paddingLeft: 24 }}>
            Associalo a un appuntamento — il barbiere lo preparerà per te
          </p>
        </div>

        {!isLoggedIn ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>
              Accedi per associare questo prodotto al tuo prossimo appuntamento
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
          <div style={{ padding: '16px', textAlign: 'center' }}>
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
          <div>
            {upcomingAppointments.map((appt, idx) => {
              const state = apptStates[appt.id] ?? {
                added: appt.hasProduct,
                loading: false,
                qty: 1,
              }
              return (
                <div
                  key={appt.id}
                  style={{
                    padding: '12px 16px',
                    borderTop: idx === 0 ? 'none' : '1px solid #F5F5F5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  {/* Appointment info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: '#222',
                        textTransform: 'capitalize',
                      }}
                    >
                      {formatDate(appt.start_time)}
                    </p>
                    {appt.serviceNames.length > 0 && (
                      <p
                        style={{
                          fontSize: 11,
                          color: '#9CA3AF',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {appt.serviceNames.join(' · ')}
                      </p>
                    )}
                  </div>

                  {/* Qty controls (only if not added) */}
                  {!state.added && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#F5F5F5',
                        borderRadius: 100,
                        padding: '3px 6px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => changeQty(appt.id, -1)}
                        style={{
                          width: 24,
                          height: 24,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <Minus size={12} color="#555" />
                      </button>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#222', minWidth: 16, textAlign: 'center' }}>
                        {state.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => changeQty(appt.id, 1)}
                        style={{
                          width: 24,
                          height: 24,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <Plus size={12} color="#555" />
                      </button>
                    </div>
                  )}

                  {/* Add / Added button */}
                  {state.added ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '7px 12px',
                        borderRadius: 100,
                        background: '#F0FDF4',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#16A34A',
                      }}
                    >
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
                      }}
                    >
                      {state.loading ? (
                        <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <Plus size={13} />
                      )}
                      {state.loading ? '' : 'Aggiungi'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Price footer */}
      <div
        style={{
          marginTop: 20,
          padding: '16px',
          background: 'var(--brand-primary, #222)',
          borderRadius: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
          {productName}
        </p>
        <p style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
          {formatPrice(priceSell)}
        </p>
      </div>
    </>
  )
}
