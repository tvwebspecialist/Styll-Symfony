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
import { formatTimeInTimezone } from '@/lib/utils/timezone'
import { AppointmentPill } from '@/components/pwa/AppointmentPill'
import { PwaProductCard } from '@/components/pwa/PwaProductCard'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const PWA_TZ = 'Europe/Rome'

function formatTime(value: string): string {
  return formatTimeInTimezone(value, PWA_TZ)
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
    new Intl.DateTimeFormat('it-IT', { weekday: 'short', timeZone: PWA_TZ }).format(new Date(value))
  )
}

function formatDay(value: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', timeZone: PWA_TZ }).format(new Date(value))
}

function formatMonth(value: string): string {
  return capitalize(
    new Intl.DateTimeFormat('it-IT', { month: 'short', timeZone: PWA_TZ }).format(new Date(value))
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
            <PwaProductCard
              key={product.id}
              name={product.name}
              brand={product.brand}
              photo_url={product.photo_url}
              price_sell={product.price_sell}
              detailHref={tp(`/prodotti/${product.id}`)}
              imageSize="160px"
              style={{ width: 160, flexShrink: 0, scrollSnapAlign: 'start' }}
            />
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
          {/* Offerte */}
          {offersCarousel && <div style={animated(0)}>{offersCarousel}</div>}

          {/* Servizi */}
          {(homeData.services ?? []).length > 0 && (
            <section style={{ ...animated(activeOffers.length > 0 ? 60 : 0), marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222', margin: 0 }}>Servizi</h2>
                <Link
                  href={tp('/prenota')}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}
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
                      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
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
                    <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-primary)' }}>
                      {formatPrice(service.price)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Prodotti */}
          {productsScroll && (
            <div style={animated(activeOffers.length > 0 ? 120 : 60)}>{productsScroll}</div>
          )}

          {/* Card accedi */}
          <div style={{ ...animated(activeOffers.length > 0 ? 180 : 120), marginBottom: 16 }}>
            <div
              style={{
                borderRadius: 20,
                background: '#111111',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Top row: text + logo */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, margin: 0 }}>
                    <span style={{ color: tenant.primary_color ?? 'var(--brand-primary)' }}>Accedi</span>
                    {' '}per non perderti nulla.
                  </p>

                </div>

                {/* Logo */}
                {tenant.logo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tenant.logo_url}
                    alt={displayBusinessName}
                    style={{
                      width: 80,
                      height: 80,
                      flexShrink: 0,
                      borderRadius: 22,
                      objectFit: 'cover',
                      boxShadow: `0 0 32px 8px ${tenant.primary_color ? tenant.primary_color + '40' : 'rgba(255,255,255,0.12)'}`,
                    }}
                  />
                )}
              </div>

              {/* CTA */}
              <Link
                href={tp('/profilo')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  alignSelf: 'flex-start',
                  marginTop: 20,
                  padding: '10px 20px',
                  borderRadius: 99,
                  background: tenant.primary_color ?? 'var(--brand-primary)',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: 500,
                  textDecoration: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Accedi
              </Link>
            </div>
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
          {/* Pill appuntamento imminente — PRIMA delle offerte */}
          <div style={{ ...animated(0), marginBottom: 16 }}>
            <AppointmentPill
              startTime={homeData.nextAppointment.startTime}
              detailHref={tp('/appuntamenti')}
            />
          </div>

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

          {/* Card appuntamento compatta — stile list item premium */}
          <div style={{ ...animated(activeOffers.length > 0 ? 120 : 60), marginBottom: 16 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                paddingLeft: 2,
                paddingRight: 2,
              }}
            >
              <p style={{ fontSize: 16, fontWeight: 500, color: '#111111', margin: 0 }}>
                Appuntamenti
              </p>
              <Link
                href={tp('/appuntamenti')}
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}
              >
                Vedi tutti
              </Link>
            </div>
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: 16,
                padding: '10px 10px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                minHeight: 68,
              }}
            >
              {/* Date box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f5f5f3',
                  borderRadius: 10,
                  padding: '6px 10px',
                  flexShrink: 0,
                  minWidth: 48,
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 700, color: '#999', letterSpacing: '0.5px', lineHeight: 1 }}>
                  {formatWeekday(homeData.nextAppointment.startTime)}
                </span>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.1, margin: '1px 0' }}>
                  {formatDay(homeData.nextAppointment.startTime)}
                </span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#999', letterSpacing: '0.5px', lineHeight: 1 }}>
                  {formatMonth(homeData.nextAppointment.startTime)}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#111111',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                    marginBottom: 2,
                  }}
                >
                  {homeData.nextAppointment.serviceNames.join(' + ') || 'Appuntamento'}
                </p>
                <p style={{ fontSize: 13, color: '#6B7280', fontWeight: 500, margin: 0 }}>
                  {formatTime(homeData.nextAppointment.startTime)}
                  {homeData.nextAppointment.staffName ? ` · con ${homeData.nextAppointment.staffName}` : ''}
                </p>
              </div>

              {/* Arrow button */}
              <Link
                href={tp('/appuntamenti')}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--brand-primary)',
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
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </Link>
            </div>
          </div>

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
        Powered by Styll ·{' '}
        <Link href={tp('/privacy')} style={{ color: '#CCCCCC', textDecoration: 'underline' }}>
          Privacy
        </Link>
      </footer>
    </main>
  )
}
