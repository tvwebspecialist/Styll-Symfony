import type { CSSProperties } from 'react'
import Link from 'next/link'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicService } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  services: PublicService[]
  slug: string
}

interface ServiceGroup {
  category: string
  services: PublicService[]
}

function groupServicesByCategory(services: PublicService[]): ServiceGroup[] {
  const groups = new Map<string, PublicService[]>()
  for (const service of services) {
    const cat = service.category?.trim() || 'Servizi principali'
    const current = groups.get(cat) ?? []
    current.push(service)
    groups.set(cat, current)
  }
  return Array.from(groups.entries()).map(([category, items]) => ({
    category,
    services: items.sort((a, b) => a.display_order - b.display_order),
  }))
}

function formatPriceNumber(price: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(price)
}

interface ServiceCardProps {
  service: PublicService
  slug: string
}

function ServiceCard({ service, slug }: ServiceCardProps) {
  return (
    <Link
      href={`/tenant/app/${slug}/prenota?service=${service.id}`}
      className="lp-service-card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '24px 24px 20px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        border: '1px solid #EFEFEF',
        textDecoration: 'none',
        minHeight: 140,
      } as CSSProperties}
    >
      <div>
        <p
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#111111',
            lineHeight: 1.3,
            marginBottom: 6,
          }}
        >
          {service.name}
        </p>
        {service.description && (
          <p
            style={{
              fontSize: '0.82rem',
              color: '#888888',
              lineHeight: 1.6,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as CSSProperties}
          >
            {service.description}
          </p>
        )}
      </div>

      <div
        style={{
          marginTop: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: '#F5F5F5',
            borderRadius: 99,
            padding: '4px 10px',
            fontSize: 12,
            fontWeight: 600,
            color: '#777',
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {service.duration_minutes} min
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'var(--brand-primary)',
              lineHeight: 1,
            }}
          >
            {formatPriceNumber(service.price)}
          </span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#AAA' }}>€</span>
        </div>
      </div>

      {/* Prenota arrow */}
      <div
        style={{
          marginTop: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '0.78rem',
          fontWeight: 700,
          color: 'var(--brand-primary)',
        }}
      >
        Prenota
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  )
}

export default function LandingServices({ services, slug }: Props) {
  if (services.length === 0) return null
  const grouped = groupServicesByCategory(services)

  return (
    <section
      aria-label="Servizi"
      id="servizi"
      data-reveal
      style={{ background: '#F7F7F7', padding: 'clamp(5rem, 10vw, 8rem) 0' } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(3rem, 6vw, 4.5rem)' }}>
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
            Cosa offriamo
          </span>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
              marginBottom: 0,
            }}
          >
            I Nostri Servizi
          </h2>
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2.5rem, 5vw, 4rem)' }}>
          {grouped.map((group) => (
            <div key={group.category}>
              {/* Category label */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 4,
                    height: 22,
                    background: 'var(--brand-primary)',
                    borderRadius: 99,
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.18em',
                    color: '#999',
                  }}
                >
                  {group.category}
                </span>
              </div>

              {/* Cards grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                  gap: 14,
                }}
              >
                {group.services.map((service) => (
                  <ServiceCard key={service.id} service={service} slug={slug} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: 'clamp(2.5rem, 5vw, 4rem)', textAlign: 'center' }}>
          <Link
            href={`/tenant/app/${slug}/prenota`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: '#111111',
              color: '#FFFFFF',
              borderRadius: 999,
              padding: '15px 36px',
              fontSize: 15,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'background 0.2s ease',
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
