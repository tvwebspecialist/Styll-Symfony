import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicService } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  services: PublicService[]
  slug: string
}

function getCategoryIcon(category: string | null): string {
  const cat = (category ?? '').toLowerCase()
  if (cat.includes('taglio') || cat.includes('capell') || cat.includes('hair')) return '✂️'
  if (cat.includes('barba') || cat.includes('rasatura') || cat.includes('beard')) return '🪒'
  if (cat.includes('color') || cat.includes('tinta')) return '🎨'
  if (cat.includes('trattament') || cat.includes('cura')) return '✨'
  if (cat.includes('massagg')) return '💆'
  if (cat.includes('sopraccig') || cat.includes('brow')) return '👁️'
  if (cat.includes('uomo') || cat.includes('man')) return '👔'
  return '💈'
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(price)
}

// Derive a stable glow color for each service
function resolveGlowColor(service: PublicService, primaryColor: string, index: number): string {
  if (service.color) return service.color
  return primaryColor
}

// Slight opacity variation per card index to create visual rhythm
const glowOpacities = [0.28, 0.22, 0.25, 0.18, 0.30, 0.20]

export default function LandingServices({ tenant, services, slug }: Props) {
  if (!services.length) return null

  const primaryColor = tenant.primary_color

  return (
    <section
      id="servizi"
      aria-label="Servizi"
      data-reveal
      style={{ background: '#0a0a0a', padding: 'clamp(5rem, 10vw, 8rem) 0', position: 'relative' } as CSSProperties}
    >
      <style>{`
        .lp-svc-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 1024px) {
          .lp-svc-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .lp-svc-grid { grid-template-columns: 1fr; }
        }
        .lp-svc-card {
          display: flex;
          flex-direction: column;
          position: relative;
          background: #141414;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 26px 24px 22px;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.25s ease, border-color 0.25s ease;
        }
        .lp-svc-card:hover {
          transform: translateY(-4px) scale(1.015);
          border-color: rgba(255,255,255,0.14);
        }
        .lp-svc-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
        }
        @media (max-width: 640px) {
          .lp-svc-header-text { flex-direction: column; }
        }
      `}</style>

      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>

        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 32,
            marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: primaryColor,
                marginBottom: 14,
              }}
            >
              Cosa offriamo
            </span>
            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              I Nostri Servizi
            </h2>
          </div>
          <p
            style={{
              fontSize: '1rem',
              color: 'rgba(255,255,255,0.45)',
              lineHeight: 1.6,
              maxWidth: 320,
              margin: 0,
              paddingBottom: 6,
            }}
          >
            Scegli il servizio che fa per te e prenota in pochi secondi.
          </p>
        </div>

        {/* Cards grid */}
        <div className="lp-svc-grid">
          {services.map((service, i) => {
            const glowColor = resolveGlowColor(service, primaryColor, i)
            const glowOpacity = glowOpacities[i % glowOpacities.length]
            const icon = getCategoryIcon(service.category)

            return (
              <Link
                key={service.id}
                href={`https://${slug}-app.styll.it/prenota?service=${service.id}`}
                className="lp-svc-card"
              >
                {/* Bottom glow */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    bottom: -10,
                    left: '15%',
                    right: '15%',
                    height: 80,
                    background: `radial-gradient(ellipse at 50% 100%, ${glowColor} 0%, transparent 70%)`,
                    opacity: glowOpacity,
                    filter: 'blur(16px)',
                    pointerEvents: 'none',
                    borderRadius: '50%',
                  }}
                />

                {/* Icon badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    fontSize: 20,
                    marginBottom: 18,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  {icon}
                </div>

                {/* Name */}
                <p
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    lineHeight: 1.3,
                    marginBottom: 8,
                  }}
                >
                  {service.name}
                </p>

                {/* Description */}
                {service.description && (
                  <p
                    style={{
                      fontSize: '0.82rem',
                      color: 'rgba(255,255,255,0.4)',
                      lineHeight: 1.55,
                      marginBottom: 0,
                      overflow: 'hidden',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                    } as CSSProperties}
                  >
                    {service.description}
                  </p>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* Duration + Price row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    marginTop: 20,
                    paddingTop: 16,
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Duration badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 99,
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.45)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    {service.duration_minutes} min
                  </span>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span
                      style={{
                        fontSize: '1.6rem',
                        fontWeight: 900,
                        color: primaryColor,
                        lineHeight: 1,
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {formatPrice(service.price)}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgba(255,255,255,0.3)', marginLeft: 1 }}>€</span>
                  </div>
                </div>

                {/* Prenota link */}
                <div
                  style={{
                    marginTop: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: primaryColor,
                  }}
                >
                  Prenota
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Trust badges */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 32px',
            justifyContent: 'center',
            marginTop: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          {[
            'Prenotazione online',
            'Pagamento in loco',
            'Cancellazione gratuita',
          ].map((badge) => (
            <span
              key={badge}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={primaryColor} strokeWidth="2.5" aria-hidden="true">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {badge}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 'clamp(2rem, 4vw, 3rem)', textAlign: 'center' }}>
          <Link
            href={`https://${slug}-app.styll.it/prenota`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              border: '1.5px solid rgba(255,255,255,0.18)',
              color: '#FFFFFF',
              background: 'transparent',
              borderRadius: 999,
              padding: '14px 36px',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'background 0.2s ease, border-color 0.2s ease',
            } as CSSProperties}
          >
            Prenota un appuntamento
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
