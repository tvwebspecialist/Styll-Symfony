import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Mail, Map } from 'lucide-react'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  firstLocation: PublicLocation | null
  slug: string
}

export default function LandingFooter({ tenant, firstLocation, slug }: Props) {
  const bio = (tenant.settings?.bio as string | undefined) ?? null
  const mapsUrl =
    firstLocation?.latitude && firstLocation?.longitude
      ? `https://maps.google.com/?q=${firstLocation.latitude},${firstLocation.longitude}`
      : null
  const address = [firstLocation?.address, firstLocation?.city].filter(Boolean).join(', ')

  return (
    <footer
      aria-label="Footer"
      style={{ background: '#050505' } as CSSProperties}
    >
      {/* Main footer content */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: 'clamp(4rem, 8vw, 6rem) clamp(20px, 5vw, 48px) 0',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'clamp(2.5rem, 5vw, 4rem)',
            paddingBottom: 'clamp(3rem, 6vw, 5rem)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          {/* Brand column */}
          <div>
            {tenant.logo_url && (
              <div style={{ marginBottom: 16 }}>
                <Image
                  src={tenant.logo_url}
                  alt={tenant.business_name}
                  width={52}
                  height={52}
                  className="rounded-2xl object-cover"
                />
              </div>
            )}

            <p
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                marginBottom: 8,
              }}
            >
              {tenant.business_name}
            </p>

            {bio && (
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.4)',
                  lineHeight: 1.65,
                  marginBottom: 20,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  maxWidth: 220,
                } as CSSProperties}
              >
                {bio}
              </p>
            )}

            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontSize: '0.7rem',
                fontWeight: 600,
                color: 'rgba(255,255,255,0.22)',
                textDecoration: 'none',
                letterSpacing: '0.05em',
                transition: 'color 0.2s',
              } as CSSProperties}
            >
              Powered by Styll ↗
            </a>
          </div>

          {/* Contatti column */}
          <div>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 20,
              }}
            >
              Contatti
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 14, listStyle: 'none', padding: 0, margin: 0 }}>
              {address && (
                <li
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    fontSize: '0.875rem',
                    color: 'rgba(255,255,255,0.5)',
                    lineHeight: 1.5,
                  }}
                >
                  <MapPin size={14} style={{ color: 'var(--brand-primary)', marginTop: 2, flexShrink: 0 }} />
                  {address}
                </li>
              )}

              {firstLocation?.phone && (
                <li>
                  <a
                    href={`tel:${firstLocation.phone}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    } as CSSProperties}
                  >
                    <Phone size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                    {firstLocation.phone}
                  </a>
                </li>
              )}

              {firstLocation?.email && (
                <li>
                  <a
                    href={`mailto:${firstLocation.email}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    } as CSSProperties}
                  >
                    <Mail size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                    {firstLocation.email}
                  </a>
                </li>
              )}

              {mapsUrl && (
                <li>
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.5)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                    } as CSSProperties}
                  >
                    <Map size={14} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
                    Vedi su Google Maps
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Esplora column */}
          <div>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 20,
              }}
            >
              Esplora
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', padding: 0, margin: 0 }}>
              {[
                { label: 'Servizi', href: '#servizi' },
                { label: 'Il team', href: '#' },
                { label: 'Galleria', href: '#' },
              ].map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    style={{
                      fontSize: '0.875rem',
                      color: 'rgba(255,255,255,0.45)',
                      textDecoration: 'none',
                      transition: 'color 0.2s',
                      display: 'block',
                    } as CSSProperties}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA column */}
          <div>
            <p
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: 'rgba(255,255,255,0.3)',
                marginBottom: 20,
              }}
            >
              Inizia ora
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link
                href={`/tenant/app/${slug}/prenota`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                  background: 'var(--brand-primary)',
                  color: '#FFFFFF',
                  borderRadius: 99,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 800,
                  textDecoration: 'none',
                  transition: 'opacity 0.2s',
                } as CSSProperties}
              >
                Prenota ora
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>

              <Link
                href={`/tenant/app/${slug}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 99,
                  padding: '12px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  transition: 'border-color 0.2s, color 0.2s',
                } as CSSProperties}
              >
                Accedi all&apos;app
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            padding: '24px 0 32px',
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)' }}>
            © {new Date().getFullYear()} {tenant.business_name}. Tutti i diritti riservati.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            <Link
              href="#"
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.2)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              } as CSSProperties}
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.2)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              } as CSSProperties}
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
