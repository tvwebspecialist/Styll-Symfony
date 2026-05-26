import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation, PublicWebsitePhoto } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  firstLocation: PublicLocation | null
  websitePhotos: PublicWebsitePhoto[]
  slug: string
  servicesCount: number
}

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export default function LandingHero({ tenant, firstLocation, websitePhotos, slug, servicesCount }: Props) {
  const heroUrl = websitePhotos[0]?.url ?? firstLocation?.photo_url ?? null
  const bio = (tenant.settings?.bio as string | undefined) ?? null
  const tagline = (tenant.settings?.tagline as string | undefined) ?? null

  return (
    <section
      id="hero"
      aria-label="Presentazione"
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Background */}
      {heroUrl ? (
        <>
          <Image fill priority src={heroUrl} alt="" className="object-cover object-center" sizes="100vw" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.8) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 90% 70% at 10% 60%, var(--brand-primary) 0%, transparent 55%),
                radial-gradient(ellipse 50% 60% at 90% 10%, color-mix(in srgb, var(--brand-primary) 35%, transparent) 0%, transparent 50%),
                #0a0a0a
              `,
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{ backgroundImage: NOISE_SVG, backgroundRepeat: 'repeat', backgroundSize: '200px 200px' }}
          />
        </>
      )}

      {/* Main content — vertically centered */}
      <div
        className="relative z-10 flex flex-1 flex-col justify-center px-6 sm:px-10"
        style={{ paddingTop: 120, paddingBottom: 80 }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', width: '100%' }}>

          {/* Eyebrow: city badge */}
          {firstLocation?.city && (
            <div
              className="mb-8 inline-flex items-center gap-2"
              style={
                {
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 999,
                  padding: '6px 14px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.8)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                } as CSSProperties
              }
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              {firstLocation.city}
            </div>
          )}

          {/* Headline */}
          <h1
            className="mb-6 max-w-4xl font-black text-white"
            style={{
              fontSize: 'clamp(3.5rem, 10vw, 7.5rem)',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            {tenant.business_name}
          </h1>

          {/* Accent line */}
          <div
            className="mb-8"
            style={{
              width: 56,
              height: 4,
              background: 'var(--brand-primary)',
              borderRadius: 99,
            }}
            aria-hidden="true"
          />

          {/* Bio / tagline */}
          <p
            className="mb-12 max-w-md"
            style={{
              fontSize: 'clamp(1rem, 2vw, 1.15rem)',
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {tagline ?? bio ?? 'Il tuo barbiere di fiducia. Prenota il tuo appuntamento in pochi secondi.'}
          </p>

          {/* Single CTA — scroll to services */}
          <a
            href="#servizi"
            aria-label="Scopri i servizi disponibili"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              borderRadius: 999,
              padding: '16px 32px',
              fontSize: '0.95rem',
              fontWeight: 700,
              color: '#FFFFFF',
              background: 'var(--brand-primary)',
              textDecoration: 'none',
              transition: 'opacity 0.2s ease',
            } as CSSProperties}
          >
            Scopri i servizi
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </a>

          {/* Stats row */}
          {servicesCount > 0 && (
            <div
              className="lp-hero-stats mt-14 flex items-center gap-10"
              aria-label="Statistiche"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32, width: 'fit-content' }}
            >
              <div>
                <p className="font-black text-white" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.04em' }}>
                  {servicesCount}
                </p>
                <p style={{ marginTop: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>
                  Servizi
                </p>
              </div>
              <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} aria-hidden="true" />
              <div>
                <p className="font-black text-white" style={{ fontSize: '2.5rem', lineHeight: 1, letterSpacing: '-0.04em' }}>
                  1&#39;
                </p>
                <p style={{ marginTop: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)' }}>
                  Per prenotare
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="lp-scroll-indicator absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex"
        style={{ color: 'rgba(255,255,255,0.28)' }}
        aria-hidden="true"
      >
        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.25em' }}>Scroll</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  )
}
