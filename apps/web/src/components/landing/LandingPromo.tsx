import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { TenantBranding } from '@/lib/tenant'
import type { Promotion } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  promotions: Promotion[]
  slug: string
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('it-IT', {
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))
}

function DiscountLabel({ promotion }: { promotion: Promotion }) {
  if (promotion.discount_type === 'percent' && promotion.discount_value) {
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '0.7rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--brand-primary)',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 99,
          padding: '4px 12px',
          marginBottom: 14,
        }}
      >
        -{promotion.discount_value}% di sconto
      </span>
    )
  }
  if (promotion.discount_type === 'fixed' && promotion.discount_value) {
    return (
      <span
        style={{
          display: 'inline-block',
          fontSize: '0.7rem',
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--brand-primary)',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 99,
          padding: '4px 12px',
          marginBottom: 14,
        }}
      >
        -€{promotion.discount_value}
      </span>
    )
  }
  return null
}

export default function LandingPromo({ tenant, promotions, slug }: Props) {
  if (promotions.length === 0) return null

  const primary = tenant.primary_color ?? '#1a1a1a'

  return (
    <section
      aria-label="Promozioni"
      data-reveal
      style={
        {
          background: '#111111',
          padding: 'clamp(5rem, 10vw, 8rem) 0',
        } as CSSProperties
      }
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--brand-primary)',
              marginBottom: 16,
            }}
          >
            Offerte speciali
          </span>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#FFFFFF',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Promozioni attive
          </h2>
        </div>

        {/* Promo cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}
          className="max-sm:flex max-sm:overflow-x-auto max-sm:gap-4 max-sm:pb-4 max-sm:[scrollbar-width:none]"
        >
          {promotions.map((promo) => (
            <div
              key={promo.id}
              style={{
                background: `linear-gradient(145deg, ${primary}DD 0%, #1A1A1A 100%)`,
                borderRadius: 24,
                padding: '28px 24px 24px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 260,
              } as CSSProperties}
            >
              <DiscountLabel promotion={promo} />

              <p
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1.25,
                  marginBottom: 10,
                }}
              >
                {promo.title}
              </p>

              {promo.description && (
                <p
                  style={{
                    fontSize: '0.875rem',
                    lineHeight: 1.65,
                    color: 'rgba(255,255,255,0.55)',
                    marginBottom: 16,
                    flex: 1,
                  }}
                >
                  {promo.description}
                </p>
              )}

              {promo.valid_until && (
                <p
                  style={{
                    fontSize: '0.72rem',
                    color: 'rgba(255,255,255,0.35)',
                    marginBottom: 20,
                    fontWeight: 600,
                  }}
                >
                  Valida fino al {formatDate(promo.valid_until)}
                </p>
              )}

              <Link
                href={`https://${slug}-app.styll.it/prenota?source=booking`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  background: '#FFFFFF',
                  color: primary,
                  borderRadius: 99,
                  padding: '12px 22px',
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                  width: 'fit-content',
                  transition: 'opacity 0.2s',
                } as CSSProperties}
              >
                Approfitta ora
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div
          style={{
            marginTop: 'clamp(2.5rem, 5vw, 4rem)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingTop: 'clamp(2rem, 4vw, 3rem)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 'clamp(1.3rem, 3vw, 1.75rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
              }}
            >
              Pronto per il tuo nuovo look?
            </p>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.45)', marginTop: 6 }}>
              Prenota il tuo appuntamento in pochi secondi.
            </p>
          </div>

          <Link
            href={`https://${slug}-app.styll.it/prenota?source=booking`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 9,
              background: 'var(--brand-primary)',
              color: '#FFFFFF',
              borderRadius: 99,
              padding: '14px 28px',
              fontSize: 15,
              fontWeight: 800,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              boxShadow: `0 8px 32px color-mix(in srgb, ${primary} 40%, transparent)`,
            } as CSSProperties}
          >
            Prenota ora
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
