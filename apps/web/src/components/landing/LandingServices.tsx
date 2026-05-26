import type { CSSProperties } from 'react'
import Link from 'next/link'
import {
  Scissors,
  Smile,
  Sparkles,
  Star,
  Hand,
  Eye,
  Layers,
  Clock,
} from 'lucide-react'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicService } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  services: PublicService[]
  slug: string
}

function getCategoryIcon(category: string | null, name: string) {
  const text = ((category ?? '') + ' ' + name).toLowerCase()
  if (text.includes('taglio') || text.includes('capell') || text.includes('hair') || text.includes('cut')) {
    return Scissors
  }
  if (text.includes('barba') || text.includes('rasatura') || text.includes('beard') || text.includes('shave')) {
    return Smile
  }
  if (text.includes('color') || text.includes('tinta') || text.includes('highlight')) {
    return Sparkles
  }
  if (text.includes('trattament') || text.includes('cura') || text.includes('treatment')) {
    return Star
  }
  if (text.includes('massagg') || text.includes('massage')) {
    return Hand
  }
  if (text.includes('sopraccig') || text.includes('brow') || text.includes('ciglia')) {
    return Eye
  }
  if (text.includes('pacchetto') || text.includes('combo') || text.includes('pack')) {
    return Layers
  }
  return Scissors
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(price)
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

export default function LandingServices({ tenant, services, slug }: Props) {
  if (!services.length) return null

  const primaryColor = tenant.primary_color
  let rgbStr = '0, 0, 0'
  try {
    if (primaryColor?.startsWith('#') && primaryColor.length === 7) {
      rgbStr = hexToRgb(primaryColor)
    }
  } catch {
    // fallback
  }
  const iconBg = `rgba(${rgbStr}, 0.1)`

  return (
    <section
      id="servizi"
      aria-label="Servizi"
      data-reveal
      style={{ background: '#FFFFFF', padding: 'clamp(5rem, 10vw, 8rem) 0', position: 'relative' } as CSSProperties}
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
        @media (max-width: 540px) {
          .lp-svc-grid { grid-template-columns: 1fr 1fr; gap: 12px; }
        }
        .lp-svc-card {
          display: flex;
          flex-direction: column;
          position: relative;
          background: #FFFFFF;
          border: 1.5px solid #F0F0F0;
          border-radius: 20px;
          padding: 24px 20px 20px;
          text-decoration: none;
          overflow: hidden;
          transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
        }
        .lp-svc-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(0,0,0,0.08) !important;
          border-color: transparent;
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
                color: '#111111',
                lineHeight: 1.06,
                letterSpacing: '-0.03em',
                margin: 0,
              }}
            >
              I nostri servizi
            </h2>
          </div>
          <p
            style={{
              fontSize: '1rem',
              color: '#888888',
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
            const IconComponent = getCategoryIcon(service.category, service.name)

            return (
              <Link
                key={service.id}
                href={`https://${slug}-app.styll.it/prenota?service=${service.id}`}
                aria-label={`Prenota ${service.name}`}
                className="lp-svc-card"
                data-reveal
                data-reveal-delay={String(i * 50)}
              >
                {/* Icon badge */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: iconBg,
                    marginBottom: 16,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <IconComponent size={22} color={primaryColor} strokeWidth={1.75} />
                </div>

                {/* Name */}
                <p
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#111111',
                    lineHeight: 1.3,
                    marginBottom: 6,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {service.name}
                </p>

                {/* Description */}
                {service.description && (
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: '#999999',
                      lineHeight: 1.55,
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
                    marginTop: 18,
                    paddingTop: 14,
                    borderTop: '1px solid #F0F0F0',
                  }}
                >
                  {/* Duration badge */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: '#F5F5F5',
                      borderRadius: 99,
                      padding: '4px 10px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#888888',
                    }}
                  >
                    <Clock size={10} strokeWidth={2.5} aria-hidden="true" />
                    {service.duration_minutes} min
                  </span>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    <span
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 900,
                        color: primaryColor,
                        lineHeight: 1,
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {formatPrice(service.price)}
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#BBBBBB', marginLeft: 2 }}>€</span>
                  </div>
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
            gap: '10px 28px',
            justifyContent: 'center',
            marginTop: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          {['Prenotazione online', 'Pagamento in loco', 'Cancellazione gratuita'].map((badge) => (
            <span
              key={badge}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#AAAAAA',
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
            aria-label="Prenota un servizio"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: primaryColor,
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '15px 36px',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            } as CSSProperties}
          >
            Prenota un servizio
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
