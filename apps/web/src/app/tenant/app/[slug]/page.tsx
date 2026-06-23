import type { CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getHomePageData } from '@/lib/actions/pwa-home'
import { readPwaPreviewConfig } from '@/lib/pwa-preview'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { getActiveOffersForClient, type ActivePromotionForClient } from '@/lib/actions/offers'
import { formatExpiryLabel, daysUntil } from '@/lib/utils/offer-pricing'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getInitials(value: string | null | undefined): string {
  return (
    (value ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ST'
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatAppointmentDate(value: string): string {
  return capitalize(
    new Intl.DateTimeFormat('it-IT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(value)),
  )
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

function rewardIcon(type: string): string {
  if (type === 'product') return '🎁'
  if (type === 'service') return '✂️'
  if (type === 'discount') return '💰'
  return '⭐'
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

export default async function AppHomePage({ params, searchParams }: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const preview = readPwaPreviewConfig(resolvedSearchParams)
  const isPreview = preview.enabled
  const displayBusinessName = preview.businessName ?? tenant.business_name
  const displayLogoUrl = preview.logoUrl ?? tenant.logo_url

  const tp = await createTenantPaths(slug)

  // Auth is managed client-side (PwaSessionRestorer) to avoid server-side 302s
  // that cause iOS to exit standalone mode. Page renders guest state initially;
  // PwaSessionRestorer syncs localStorage → cookie and triggers router.refresh().
  let homeData: Awaited<ReturnType<typeof getHomePageData>>
  try {
    homeData = await getHomePageData(tenant.tenant_id)
  } catch {
    // Graceful degradation: render guest/empty state rather than crashing
    homeData = { isLoggedIn: false, staffMembers: [], staffCount: 0 }
  }
  const rewards = homeData.activeRewards ?? []
  const availablePoints = homeData.loyalty?.availablePoints ?? 0
  const nextReward = rewards.find((reward) => reward.pointsCost > availablePoints)
  const shouldRenderGuestState = isPreview || !homeData.isLoggedIn

  let activeOffers: ActivePromotionForClient[] = []
  if (!shouldRenderGuestState && homeData.clientId) {
    try {
      activeOffers = await getActiveOffersForClient(tenant.tenant_id, homeData.clientId)
    } catch { /* graceful degradation */ }
  }

  return (
    <main style={{ padding: '8px 16px 24px', maxWidth: 640, margin: '0 auto' }}>
      {shouldRenderGuestState ? (
        <>
          <section
            style={{
              ...animated(0),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 28,
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            {displayLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayLogoUrl}
                alt={displayBusinessName}
                fetchPriority="high"
                loading="eager"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  objectFit: 'cover',
                  margin: '0 auto 16px',
                }}
              />
            ) : (
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 999,
                  background: 'var(--brand-primary)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  margin: '0 auto 16px',
                }}
              >
                {getInitials(displayBusinessName)}
              </div>
            )}
            <p style={{ fontSize: 13, color: '#B0B0B0', marginBottom: 8 }}>Ciao! 👋</p>
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
            <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 12 }}>
              Il tuo salone di fiducia, sempre con te.
            </p>
          </section>

          <Link
            href={tp("/prenota")}
            style={{
              ...animated(60),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: 56,
              borderRadius: 999,
              background: 'var(--brand-primary)',
              color: '#FFFFFF',
              textDecoration: 'none',
              fontSize: 16,
              fontWeight: 700,
              padding: '0 20px',
              marginBottom: 16,
            }}
          >
            📅 Prenota il tuo prossimo appuntamento →
          </Link>

          <section
            style={{
              ...animated(120),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎁</span>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#222222' }}>Programma fedeltà</h2>
            </div>
            <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 10 }}>
              Prenota, accumula punti e sblocca premi esclusivi.
            </p>
            <Link
              href={tp("/profilo")}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 46,
                borderRadius: 999,
                border: '1.5px solid var(--brand-primary)',
                color: 'var(--brand-primary)',
                fontSize: 14,
                fontWeight: 700,
                textDecoration: 'none',
                marginTop: 16,
                padding: '0 14px',
              }}
            >
              Accedi per vedere i tuoi punti
            </Link>
          </section>

          {homeData.staffMembers.length > 0 ? (
            <section
              style={{
                ...animated(180),
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222' }}>Il team</h2>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
                {homeData.staffMembers.slice(0, 3).map((member, index) => (
                  <div
                    key={member.id}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      overflow: 'hidden',
                      marginLeft: index === 0 ? 0 : -8,
                      border: '2px solid #FFFFFF',
                      background: '#E9E9E9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666666',
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.fullName ?? 'Staff'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      getInitials(member.fullName)
                    )}
                  </div>
                ))}
                {homeData.staffCount > 3 ? (
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      marginLeft: -8,
                      border: '2px solid #FFFFFF',
                      background: '#F5F5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#666666',
                      fontSize: 13,
                      fontWeight: 700,
                    }}
                  >
                    +{homeData.staffCount - 3}
                  </div>
                ) : null}
              </div>
              <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 8 }}>
                Professionisti al tuo servizio
              </p>
            </section>
          ) : null}
        </>
      ) : (
        <>
          {activeOffers.length > 0 && (
            <section style={{ ...animated(0), marginBottom: 16, marginLeft: -16, marginRight: -16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px 12px' }}>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222', margin: 0 }}>Offerte</h2>
                <Link
                  href={tp('/offerte')}
                  style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand-primary)', textDecoration: 'none' }}
                >
                  Vedi tutte
                </Link>
              </div>

              {/* Carousel — native horizontal scroll */}
              <div
                style={{
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
                } as CSSProperties}
              >
                {activeOffers.map((offer) => {
                  const allItems = [...offer.service_items, ...offer.product_items]
                  const pctMax = allItems.filter(i => i.discount_type === 'percent').reduce((m, i) => Math.max(m, i.discount_value), 0)
                  const fixedMax = allItems.filter(i => i.discount_type === 'fixed').reduce((m, i) => Math.max(m, i.discount_value), 0)
                  let discountLabel = ''
                  if (allItems.length === 1) {
                    const item = allItems[0]
                    discountLabel = item.discount_type === 'percent' ? `${item.discount_value}% Sconto` : `€${item.discount_value} Sconto`
                  } else if (pctMax > 0) {
                    discountLabel = `Fino al ${pctMax}% Sconto`
                  } else if (fixedMax > 0) {
                    discountLabel = `Fino a €${fixedMax} Sconto`
                  }

                  const showExpiry = offer.valid_until !== null && daysUntil(offer.valid_until) <= 7
                  const expiryText = offer.valid_until ? `Scade tra ${daysUntil(offer.valid_until)} gg` : ''

                  return (
                    <Link
                      key={offer.id}
                      href={tp(`/offerte/${offer.id}`)}
                      style={{
                        display: 'block',
                        flexShrink: 0,
                        width: 'calc(100vw - 40px)',
                        height: 180,
                        borderRadius: 20,
                        overflow: 'hidden',
                        position: 'relative',
                        scrollSnapAlign: 'start',
                        textDecoration: 'none',
                        background: 'linear-gradient(135deg, #27272A 0%, #3F3F46 100%)',
                      } as CSSProperties}
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
                        <div style={{
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
                        } as CSSProperties}>
                          {expiryText}
                        </div>
                      )}
                      <div style={{
                        position: 'absolute',
                        bottom: 12,
                        left: 12,
                        right: 12,
                        background: '#FFFFFF',
                        borderRadius: 16,
                        padding: 16,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#71717A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {offer.title}
                          </p>
                          {discountLabel && (
                            <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 800, color: '#18181B', lineHeight: 1.2 }}>
                              {discountLabel}
                            </p>
                          )}
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#18181B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          )}

          <div style={{ padding: '20px 16px 8px' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#222222' }}>
              Ciao, {homeData.clientName ?? 'Benvenuto'} 👋
            </h1>
            <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 4 }}>Bentornato da noi</p>
          </div>

          <section
            style={{
              ...animated(0),
              background: '#FFFFFF',
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            {homeData.nextAppointment ? (
              <>
                <p
                  style={{
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: '#B0B0B0',
                  }}
                >
                  Prossimo appuntamento
                </p>
                <p style={{ fontSize: 18, fontWeight: 800, color: '#222222', marginTop: 8 }}>
                  {formatAppointmentDate(homeData.nextAppointment.startTime)}
                </p>
                <p style={{ fontSize: 14, color: '#B0B0B0', marginTop: 4 }}>
                  alle {formatTime(homeData.nextAppointment.startTime)}
                </p>
                {homeData.nextAppointment.serviceNames.length > 0 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    {homeData.nextAppointment.serviceNames.map((serviceName) => (
                      <span
                        key={serviceName}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: '#F5F5F5',
                          borderRadius: 999,
                          padding: '4px 10px',
                          fontSize: 12,
                          color: '#222222',
                        }}
                      >
                        {serviceName}
                      </span>
                    ))}
                  </div>
                ) : null}
                <Link
                  href={tp("/profilo")}
                  style={{
                    display: 'inline-flex',
                    marginTop: 12,
                    color: 'var(--brand-primary)',
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Vedi dettagli
                </Link>
              </>
            ) : (
              <>
                <p style={{ fontSize: 14, color: '#B0B0B0' }}>Nessun appuntamento in programma</p>
                <Link
                  href={tp("/prenota")}
                  style={{
                    display: 'inline-flex',
                    marginTop: 12,
                    color: 'var(--brand-primary)',
                    fontSize: 14,
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Prenota ora →
                </Link>
              </>
            )}
          </section>

          {homeData.loyalty ? (
            <section
              style={{
                ...animated(60),
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
                  marginTop: 10,
                }}
              >
                {homeData.loyalty.availablePoints}
              </p>
              <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 4 }}>punti disponibili</p>
              <hr style={{ border: 'none', borderTop: '1px solid #F0F0F0', margin: '12px 0' }} />
              <p
                style={{
                  fontSize: 14,
                  fontWeight: homeData.loyalty.currentStreak > 0 ? 700 : 400,
                  color: homeData.loyalty.currentStreak > 0 ? '#222222' : '#B0B0B0',
                }}
              >
                {homeData.loyalty.currentStreak > 0
                  ? `🔥 ${homeData.loyalty.currentStreak} visite consecutive`
                  : 'Inizia la tua serie!'}
              </p>
              {homeData.loyalty.lastVisitDate ? (
                <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 6 }}>
                  Ultima visita: {daysAgo(homeData.loyalty.lastVisitDate)} giorni fa
                </p>
              ) : null}
              {nextReward ? (
                <>
                  <div
                    style={{
                      width: '100%',
                      height: 6,
                      borderRadius: 3,
                      background: '#F0F0F0',
                      marginTop: 14,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, Math.round((homeData.loyalty.availablePoints / nextReward.pointsCost) * 100))}%`,
                        height: 6,
                        borderRadius: 3,
                        background: 'var(--brand-primary)',
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 12, color: '#B0B0B0', marginTop: 4 }}>
                    {homeData.loyalty.availablePoints} / {nextReward.pointsCost} pt per {nextReward.name}
                  </p>
                </>
              ) : null}
            </section>
          ) : null}


          {rewards.length > 0 ? (
            <section
              style={{
                ...animated(120),
                background: '#FFFFFF',
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#222222', marginBottom: 14 }}>
                Premi disponibili
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                {rewards.map((reward) => {
                  const canAfford = availablePoints >= reward.pointsCost
                  return (
                    <div
                      key={reward.id}
                      style={{
                        borderRadius: 14,
                        border: `1px solid ${canAfford ? 'var(--brand-primary)' : '#F0F0F0'}`,
                        padding: 14,
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: 28, lineHeight: 1 }}>{rewardIcon(reward.rewardType)}</div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#222222', marginTop: 6 }}>
                        {reward.pointsCost} pt
                      </p>
                      <p
                        style={{
                          fontSize: 11,
                          color: '#B0B0B0',
                          marginTop: 4,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {reward.name}
                      </p>
                      {canAfford ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 4,
                            borderRadius: 999,
                            padding: '2px 8px',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--brand-primary)',
                            background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                          }}
                        >
                          Riscatta!
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}

          {homeData.lastAppointmentServiceNames && homeData.lastAppointmentServiceNames.length > 0 ? (
            <Link
              href={tp("/prenota")}
              style={{
                ...animated(180),
                display: 'block',
                background: 'rgba(0,0,0,0.03)',
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                textDecoration: 'none',
                border: '1px solid color-mix(in srgb, var(--brand-primary) 18%, transparent)',
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)' }}>↩ Riprenota</p>
              <p style={{ fontSize: 13, color: '#B0B0B0', marginTop: 6 }}>
                {homeData.lastAppointmentServiceNames.join(' + ')}
              </p>
            </Link>
          ) : null}
        </>
      )}

      <footer
        style={{
          ...animated(240),
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
