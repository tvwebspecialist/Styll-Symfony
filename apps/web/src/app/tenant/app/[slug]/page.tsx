import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getHomePageData } from '@/lib/actions/pwa-home'
import { readPwaPreviewConfig } from '@/lib/pwa-preview'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getActiveOffersForClient, type ActivePromotionForClient } from '@/lib/actions/offers'
import { daysUntil } from '@/lib/utils/offer-pricing'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function daysAgo(value: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000))
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price)
}

function getTierInfo(totalPoints: number): { label: string; emoji: string; color: string; bg: string } {
  if (totalPoints >= 500) return { label: 'Oro', emoji: '🥇', color: '#7C5E19', bg: '#FEF3C7' }
  if (totalPoints >= 200) return { label: 'Argento', emoji: '🥈', color: '#4B5563', bg: '#F3F4F6' }
  return { label: 'Bronzo', emoji: '🥉', color: '#7C3016', bg: '#FEF0E6' }
}

function animated(delay: number): CSSProperties {
  return {
    opacity: 0,
    animationName: 'fadeSlideUp',
    animationDuration: '0.3s',
    animationTimingFunction: 'ease-out',
    animationFillMode: 'forwards',
    animationDelay: `${delay}ms`,
  }
}

function formatWeekday(value: string): string {
  return capitalize(
    new Intl.DateTimeFormat('it-IT', { weekday: 'short' }).format(new Date(value))
  )
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric' }).format(new Date(value))
}

function formatMonth(value: string): string {
  return capitalize(
    new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(new Date(value))
  )
}

export default async function AppHomePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const preview = readPwaPreviewConfig(resolvedSearchParams)
  const isPreview = preview.enabled
  const displayBusinessName = preview.businessName ?? tenant.business_name

  const tp = await createTenantPaths(slug)

  let homeData: Awaited<ReturnType<typeof getHomePageData>>
  try {
    homeData = await getHomePageData(tenant.tenant_id)
  } catch {
    homeData = { isLoggedIn: false, staffMembers: [], staffCount: 0 }
  }

  const shouldRenderGuestState = isPreview || !homeData.isLoggedIn

  let activeOffers: ActivePromotionForClient[] = []
  if (!shouldRenderGuestState && homeData.clientId) {
    try {
      activeOffers = await getActiveOffersForClient(tenant.tenant_id, homeData.clientId)
    } catch { /* graceful degradation */ }
  }

  // State determination
  const isGuest = shouldRenderGuestState
  const hasNextAppointment = !isGuest && !!homeData.nextAppointment
  const isImminent = hasNextAppointment && (homeData.nextAppointmentIsImminent ?? false)

  const availablePoints = homeData.loyalty?.availablePoints ?? 0
  const rewards = homeData.activeRewards ?? []
  const nextReward = rewards.find((r) => r.pointsCost > availablePoints)
  const tier = homeData.loyalty ? getTierInfo(homeData.loyalty.totalPoints) : null

  const mapsUrl = homeData.nextAppointment?.locationAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        [homeData.nextAppointment.locationAddress, homeData.nextAppointment.locationCity]
          .filter(Boolean)
          .join(', ')
      )}`
    : null

  // ── Shared blocks ────────────────────────────────────────────────────────────

  const offersCarousel =
    activeOffers.length > 0 ? (
      <section style={{ marginBottom: 16, marginLeft: -16, marginRight: -16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px 12px',
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222', margin: 0 }}>Offerte</h2>
          <Link
            href={tp('/offerte')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
            }}
          >
            Vedi tutte
          </Link>
        </div>

        <div
          style={
            {
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              scrollPaddingLeft: 16,
              paddingLeft: 16,
              paddingRight: 16,
              paddingBottom: 8,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            } as CSSProperties
          }
        >
          {activeOffers.map((offer) => {
            const allItems = [...offer.service_items, ...offer.product_items]
            const pctMax = allItems
              .filter((i) => i.discount_type === 'percent')
              .reduce((m, i) => Math.max(m, i.discount_value), 0)
            const fixedMax = allItems
              .filter((i) => i.discount_type === 'fixed')
              .reduce((m, i) => Math.max(m, i.discount_value), 0)
            let discountLabel = ''
            if (allItems.length === 1) {
              const item = allItems[0]
              discountLabel =
                item.discount_type === 'percent'
                  ? `${item.discount_value}% Sconto`
                  : `€${item.discount_value} Sconto`
            } else if (pctMax > 0) {
              discountLabel = `Fino al ${pctMax}% Sconto`
            } else if (fixedMax > 0) {
              discountLabel = `Fino a €${fixedMax} Sconto`
            }

            const showExpiry = offer.valid_until !== null && daysUntil(offer.valid_until) <= 7
            const expiryText = offer.valid_until
              ? `Scade tra ${daysUntil(offer.valid_until)} gg`
              : ''

            return (
              <Link
                key={offer.id}
                href={tp(`/offerte/${offer.id}`)}
                style={
                  {
                    display: 'block',
                    flexShrink: 0,
                    width: 'calc(100vw - 40px)',
                    height: 180,
                    borderRadius: 28,
                    overflow: 'hidden',
                    position: 'relative',
                    scrollSnapAlign: 'start',
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, #27272A 0%, #3F3F46 100%)',
                  } as CSSProperties
                }
              >
                {offer.cover_image_url && (
                  <Image
                    fill
                    src={offer.cover_image_url}
                    alt={offer.title}
                    sizes="calc(100vw - 40px)"
                    style={{ objectFit: 'cover' }}
                    loading="lazy"
                  />
                )}
                {showExpiry && (
                  <div
                    style={
                      {
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        background: 'rgba(0,0,0,0.50)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        color: '#FFFFFF',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 999,
                        padding: '3px 10px',
                      } as CSSProperties
                    }
                  >
                    {expiryText}
                  </div>
                )}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    right: 12,
                    background: '#FFFFFF',
                    borderRadius: 20,
                    padding: 16,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#71717A',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {offer.title}
                    </p>
                    {discountLabel && (
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: 22,
                          fontWeight: 800,
                          color: '#18181B',
                          lineHeight: 1.2,
                        }}
                      >
                        {discountLabel}
                      </p>
                    )}
                  </div>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#18181B"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0 }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    ) : null

  const productsScroll =
    (homeData.products ?? []).length > 0 ? (
      <section style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222', margin: 0 }}>Prodotti</h2>
          <Link
            href={tp('/prodotti')}
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--brand-primary)',
              textDecoration: 'none',
            }}
          >
            Vedi tutti
          </Link>
        </div>
        <div
          style={
            {
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              paddingBottom: 8,
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            } as CSSProperties
          }
        >
          {(homeData.products ?? []).map((product) => (
            <Link
              key={product.id}
              href={tp(`/prodotti/${product.id}`)}
              style={{
                display: 'block',
                flexShrink: 0,
                width: 152,
                background: '#FFFFFF',
                borderRadius: 20,
                border: '1px solid #F0F0F0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                textDecoration: 'none',
                overflow: 'hidden',
                scrollSnapAlign: 'start',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '1/1',
                  background: 'linear-gradient(135deg, #f3f4f6, #e5e7eb)',
                }}
              >
                {product.photo_url ? (
                  <Image
                    src={product.photo_url}
                    alt={product.name}
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="152px"
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                    }}
                  >
                    🧴
                  </div>
                )}
              </div>
              <div style={{ padding: '8px 12px 12px' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: product.brand ? 2 : 6,
                  }}
                >
                  {product.name}
                </p>
                {product.brand && (
                  <p
                    style={{
                      fontSize: 11,
                      color: '#B0B0B0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 6,
                    }}
                  >
                    {product.brand}
                  </p>
                )}
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>
                  {formatPrice(product.price_sell)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ) : null

  // ── Called as a regular function (not JSX element) to avoid static-component lint rule ──
  const loyaltySection = (delay: number, extraText?: string) => {
    if (!homeData.loyalty || !tier) return null
    return (
      <section
        style={{
          ...animated(delay),
          background: '#FFFFFF',
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#B0B0B0',
                marginBottom: 6,
              }}
            >
              I tuoi punti
            </p>
            <p
              style={{
                fontSize: 42,
                fontWeight: 800,
                color: 'var(--brand-primary)',
                lineHeight: 1,
              }}
            >
              {availablePoints}
            </p>
            <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 2 }}>punti disponibili</p>
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: tier.bg,
              color: tier.color,
              fontSize: 11,
              fontWeight: 700,
              borderRadius: 999,
              padding: '4px 10px',
              marginTop: 2,
            }}
          >
            {tier.emoji} {tier.label}
          </span>
        </div>
        {nextReward ? (
          <>
            <div
              style={{
                width: '100%',
                height: 6,
                borderRadius: 3,
                background: '#F0F0F0',
                marginTop: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(100, Math.round((availablePoints / nextReward.pointsCost) * 100))}%`,
                  height: 6,
                  borderRadius: 3,
                  background: 'var(--brand-primary)',
                }}
              />
            </div>
            <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 4 }}>
              Ancora {Math.max(0, nextReward.pointsCost - availablePoints)} pt per {nextReward.name}
            </p>
          </>
        ) : null}
        {extraText ? (
          <p style={{ fontSize: 13, fontWeight: 700, color: '#222222', marginTop: 12 }}>
            {extraText}
          </p>
        ) : null}
      </section>
    )
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>

      {/* ═══════════════════════════════════════════════════════════════════════
          STATE A — GUEST
          ════════════════════════════════════════════════════════════════════ */}
      {isGuest && (
        <>
          {/* Hero */}
          <section
            style={{
              ...animated(0),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              marginBottom: 16,
            }}
          >
            <p style={{ fontSize: 26, fontWeight: 800, color: '#222222', lineHeight: 1.15 }}>
              Benvenuto da
            </p>
            <p
              style={{
                fontSize: 26,
                fontWeight: 800,
                color: 'var(--brand-primary)',
                lineHeight: 1.15,
                marginTop: 2,
              }}
            >
              {displayBusinessName}
            </p>
            <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 8 }}>
              Il tuo salone di fiducia, sempre con te.
            </p>
            <Link
              href={tp('/prenota')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 54,
                borderRadius: 999,
                background: 'var(--brand-primary)',
                color: '#FFFFFF',
                textDecoration: 'none',
                fontSize: 16,
                fontWeight: 700,
                marginTop: 20,
              }}
            >
              📅 Prenota ora
            </Link>
          </section>

          {/* Servizi */}
          {(homeData.services ?? []).length > 0 && (
            <section style={{ ...animated(60), marginBottom: 16 }}>
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: '#222222',
                  marginBottom: 12,
                }}
              >
                Servizi
              </h2>
              <div
                style={
                  {
                    display: 'flex',
                    gap: 8,
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    paddingBottom: 8,
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                  } as CSSProperties
                }
              >
                {(homeData.services ?? []).map((service) => (
                  <Link
                    key={service.id}
                    href={tp('/prenota')}
                    style={{
                      display: 'block',
                      flexShrink: 0,
                      width: 160,
                      background: '#FFFFFF',
                      borderRadius: 16,
                      padding: 16,
                      border: '1px solid #F0F0F0',
                      textDecoration: 'none',
                      scrollSnapAlign: 'start',
                    }}
                  >
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#222222',
                        marginBottom: 8,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {service.name}
                    </p>
                    <p style={{ fontSize: 12, color: '#B0B0B0', marginBottom: 4 }}>
                      {service.duration_minutes} min
                    </p>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: 'var(--brand-primary)',
                      }}
                    >
                      {formatPrice(service.price)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Prodotti */}
          {productsScroll && (
            <div style={animated(120)}>{productsScroll}</div>
          )}

          {/* Banner loyalty */}
          <div
            style={{
              ...animated(180),
              background: '#F9F9F9',
              borderRadius: 16,
              padding: '16px 20px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <p style={{ fontSize: 13, color: '#666666', flex: 1, margin: 0 }}>
              💈 Accedi per guadagnare punti ad ogni visita
            </p>
            <Link
              href={tp('/accesso')}
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                flexShrink: 0,
              }}
            >
              Accedi
            </Link>
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STATE B — LOGGATO, NESSUN APPUNTAMENTO FUTURO
          ════════════════════════════════════════════════════════════════════ */}
      {!isGuest && !hasNextAppointment && (
        <>
          {/* Offerte */}
          {offersCarousel && <div style={animated(0)}>{offersCarousel}</div>}

          {/* Hero CTA scuro */}
          <section
            style={{
              ...animated(activeOffers.length > 0 ? 60 : 0),
              background: '#1a1a1a',
              borderRadius: 20,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.2,
              }}
            >
              È ora di un nuovo taglio ✂️
            </p>
            {homeData.loyalty?.lastVisitDate ? (
              <p style={{ fontSize: 13, color: '#9CA3AF', marginTop: 8 }}>
                Ultima visita: {daysAgo(homeData.loyalty.lastVisitDate)} giorni fa
              </p>
            ) : null}
            <Link
              href={tp('/prenota')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 52,
                borderRadius: 999,
                background: '#FFFFFF',
                color: '#1a1a1a',
                textDecoration: 'none',
                fontSize: 15,
                fontWeight: 700,
                marginTop: 20,
              }}
            >
              Prenota ora
            </Link>
          </section>

          {/* Rebooking rapido */}
          {homeData.lastAppointmentServiceNames && homeData.lastAppointmentServiceNames.length > 0 ? (
            <section
              style={{
                ...animated(activeOffers.length > 0 ? 120 : 60),
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#B0B0B0',
                  marginBottom: 14,
                }}
              >
                {`Riprenota l'ultima volta`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>✂️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#222222',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {homeData.lastAppointmentServiceNames.join(' + ')}
                  </p>
                  <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 3 }}>
                    {[
                      homeData.lastAppointmentStaffName,
                      homeData.lastAppointmentDuration
                        ? `${homeData.lastAppointmentDuration} min`
                        : null,
                      homeData.lastAppointmentPrice != null
                        ? formatPrice(homeData.lastAppointmentPrice)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Link
                  href={tp('/prenota')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: 36,
                    padding: '0 16px',
                    borderRadius: 999,
                    background: '#1a1a1a',
                    color: '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  Riprenota
                </Link>
              </div>
            </section>
          ) : null}

          {/* Loyalty */}
          {loyaltySection(activeOffers.length > 0 ? 180 : 120)}

          {/* Prodotti */}
          {productsScroll && (
            <div style={animated(activeOffers.length > 0 ? 240 : 180)}>{productsScroll}</div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STATE C — LOGGATO, APPUNTAMENTO IMMINENTE (< 48h)
          ════════════════════════════════════════════════════════════════════ */}
      {!isGuest && isImminent && homeData.nextAppointment && (
        <>
          {/* Card appuntamento — PRIMA delle offerte */}
          <section
            style={{
              ...animated(0),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              border: '2px solid var(--brand-primary)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'var(--brand-primary)',
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Il tuo appuntamento è oggi 🔔
            </p>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Date box */}
              <div
                style={{
                  textAlign: 'center',
                  background: 'var(--brand-primary)',
                  borderRadius: 14,
                  padding: '12px 16px',
                  flexShrink: 0,
                  color: '#FFFFFF',
                  minWidth: 64,
                }}
              >
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    opacity: 0.8,
                    margin: 0,
                  }}
                >
                  {formatWeekday(homeData.nextAppointment.startTime)}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    lineHeight: 1.1,
                    margin: '4px 0',
                  }}
                >
                  {formatDay(homeData.nextAppointment.startTime)}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    opacity: 0.8,
                    margin: 0,
                  }}
                >
                  {formatMonth(homeData.nextAppointment.startTime)}
                </p>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: '#222222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {homeData.nextAppointment.serviceNames.join(' + ') || 'Appuntamento'}
                </p>
                <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 4 }}>
                  alle {formatTime(homeData.nextAppointment.startTime)}
                </p>
                {homeData.nextAppointment.staffName ? (
                  <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 2 }}>
                    con {homeData.nextAppointment.staffName}
                  </p>
                ) : null}
              </div>
            </div>
            {/* Quick actions */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 20,
                paddingTop: 16,
                borderTop: '1px solid #F0F0F0',
              }}
            >
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    height: 38,
                    borderRadius: 999,
                    background: '#F5F5F5',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#222222',
                    textDecoration: 'none',
                    gap: 4,
                  }}
                >
                  📍 Indicazioni
                </a>
              ) : (
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    height: 38,
                    borderRadius: 999,
                    background: '#F5F5F5',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#B0B0B0',
                    gap: 4,
                  }}
                >
                  📍 Indicazioni
                </span>
              )}
              <Link
                href={tp('/appuntamenti')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  height: 38,
                  borderRadius: 999,
                  background: '#F5F5F5',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#222222',
                  textDecoration: 'none',
                  gap: 4,
                }}
              >
                📅 Calendario
              </Link>
              <Link
                href={tp('/prenota')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  height: 38,
                  borderRadius: 999,
                  background: '#F5F5F5',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#222222',
                  textDecoration: 'none',
                  gap: 4,
                }}
              >
                ✏️ Modifica
              </Link>
            </div>
          </section>

          {/* Offerte */}
          {offersCarousel && <div style={animated(60)}>{offersCarousel}</div>}

          {/* Loyalty + bonus punti */}
          {loyaltySection(
            activeOffers.length > 0 ? 120 : 60,
            homeData.loyaltyConfig?.pointsPerVisit
              ? `Dopo questo taglio: +${homeData.loyaltyConfig.pointsPerVisit} pt 🔥`
              : 'Dopo questo taglio guadagnerai punti 🔥',
          )}

          {/* Prodotti */}
          {productsScroll && (
            <div style={animated(activeOffers.length > 0 ? 180 : 120)}>{productsScroll}</div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STATE D — LOGGATO, APPUNTAMENTO FUTURO (> 48h)
          ════════════════════════════════════════════════════════════════════ */}
      {!isGuest && hasNextAppointment && !isImminent && homeData.nextAppointment && (
        <>
          {/* Offerte */}
          {offersCarousel && <div style={animated(0)}>{offersCarousel}</div>}

          {/* Loyalty */}
          {loyaltySection(
            activeOffers.length > 0 ? 60 : 0,
            homeData.loyalty?.currentStreak && homeData.loyalty.currentStreak > 0
              ? `🔥 ${homeData.loyalty.currentStreak} visite consecutive`
              : 'Continua a venire per scalare i livelli!',
          )}

          {/* Card appuntamento (compatta) */}
          <section
            style={{
              ...animated(activeOffers.length > 0 ? 120 : 60),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#B0B0B0',
                marginBottom: 14,
              }}
            >
              Prossimo appuntamento
            </p>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {/* Compact date box */}
              <div
                style={{
                  textAlign: 'center',
                  background: '#F5F5F5',
                  borderRadius: 12,
                  padding: '10px 14px',
                  flexShrink: 0,
                  minWidth: 58,
                }}
              >
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#B0B0B0',
                    margin: 0,
                  }}
                >
                  {formatWeekday(homeData.nextAppointment.startTime)}
                </p>
                <p
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#222222',
                    lineHeight: 1.1,
                    margin: '4px 0',
                  }}
                >
                  {formatDay(homeData.nextAppointment.startTime)}
                </p>
                <p
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: '#B0B0B0',
                    margin: 0,
                  }}
                >
                  {formatMonth(homeData.nextAppointment.startTime)}
                </p>
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#222222',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {homeData.nextAppointment.serviceNames.join(' + ') || 'Appuntamento'}
                </p>
                <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 4 }}>
                  alle {formatTime(homeData.nextAppointment.startTime)}
                </p>
              </div>
              {/* Arrow */}
              <Link
                href={tp('/appuntamenti')}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#F5F5F5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#222222"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            </div>
          </section>

          {/* Prodotti */}
          {productsScroll && (
            <div style={animated(activeOffers.length > 0 ? 180 : 120)}>{productsScroll}</div>
          )}
        </>
      )}

      <footer
        style={{
          ...animated(300),
          fontSize: 11,
          color: '#CCCCCC',
          textAlign: 'center',
          padding: '24px 0 8px',
        }}
      >
        Powered by Styll · Termini · Privacy
      </footer>
    </main>
  )
}
