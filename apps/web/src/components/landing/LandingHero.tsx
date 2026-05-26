import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
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

  return (
    <section
      aria-label="Presentazione"
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* Background */}
      {heroUrl ? (
        <>
          <Image fill priority src={heroUrl} alt="" className="object-cover" sizes="100vw" />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(160deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.75) 100%)',
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

      {/* Top bar */}
      <div className="relative z-20 flex items-center justify-between px-6 py-6 sm:px-10">
        <div className="flex items-center gap-3">
          {tenant.logo_url && (
            <Image
              src={tenant.logo_url}
              alt={tenant.business_name}
              width={40}
              height={40}
              className="rounded-xl object-cover"
            />
          )}
          <span
            className="hidden text-sm font-semibold text-white/70 sm:block"
            style={{ letterSpacing: '-0.01em' }}
          >
            {tenant.business_name}
          </span>
        </div>

        <Link
          href={`https://${slug}-app.styll.it/prenota`}
          aria-label={`Prenota da ${tenant.business_name}`}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-white/25"
          style={
            {
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.2)',
            } as CSSProperties
          }
        >
          Prenota
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-20 sm:px-10 md:justify-center md:pb-0 md:py-12">
        {/* Location badge */}
        {firstLocation?.city && (
          <div
            className="mb-6 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/90"
            style={
              {
                background: 'rgba(255,255,255,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)',
              } as CSSProperties
            }
          >
            <MapPin size={10} />
            {firstLocation.city}
          </div>
        )}

        {/* Headline */}
        <h1
          className="mb-5 max-w-3xl font-black text-white"
          style={{
            fontSize: 'clamp(3rem, 9vw, 6.5rem)',
            lineHeight: 1.0,
            letterSpacing: '-0.04em',
          }}
        >
          {tenant.business_name}
        </h1>

        {/* Divider line */}
        <div
          className="mb-6 h-px w-16"
          style={{ background: 'var(--brand-primary)' }}
          aria-hidden="true"
        />

        {/* Bio */}
        <p
          className="mb-10 max-w-lg"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.125rem)',
            lineHeight: 1.75,
            color: 'rgba(255,255,255,0.62)',
          }}
        >
          {bio ?? 'Il tuo barbiere di fiducia. Prenota il tuo appuntamento in pochi secondi.'}
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3">
          <Link
            href={`https://${slug}-app.styll.it/prenota`}
            aria-label={`Prenota appuntamento da ${tenant.business_name}`}
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-bold text-white shadow-xl transition-opacity hover:opacity-90"
            style={{ background: 'var(--brand-primary)' }}
          >
            Prenota ora
            <ArrowRight size={16} />
          </Link>
          <Link
            href="#servizi"
            className="inline-flex items-center gap-2 rounded-full px-7 py-4 text-[15px] font-semibold text-white transition-colors hover:bg-white/15"
            style={
              {
                border: '1.5px solid rgba(255,255,255,0.22)',
                background: 'rgba(255,255,255,0.06)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              } as CSSProperties
            }
          >
            Scopri i servizi
          </Link>
        </div>

        {/* Stats row */}
        {servicesCount > 0 && (
          <div className="lp-hero-stats mt-12 flex items-center gap-8" aria-label="Numeri">
            <div>
              <p
                className="font-black text-white"
                style={{ fontSize: '2rem', lineHeight: 1 }}
              >
                {servicesCount}
              </p>
              <p
                className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Servizi
              </p>
            </div>

            <div className="h-10 w-px" style={{ background: 'rgba(255,255,255,0.12)' }} aria-hidden="true" />

            <div>
              <p
                className="font-black text-white"
                style={{ fontSize: '2rem', lineHeight: 1 }}
              >
                1&apos;
              </p>
              <p
                className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: 'rgba(255,255,255,0.38)' }}
              >
                Per prenotare
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div
        className="lp-scroll-indicator absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 md:flex"
        style={{ color: 'rgba(255,255,255,0.3)' }}
        aria-hidden="true"
      >
        <span className="text-[9px] font-bold uppercase tracking-[0.25em]">Scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  )
}
