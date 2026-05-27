import Image from 'next/image'
import Link from 'next/link'
import type { LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
  servicesCount?: number
}

export default function LandingHero({ tenant }: Props) {
  const tagline = tenant.tagline?.trim() || null
  const description = tenant.description?.trim() || null

  const bookingUrl = `https://${tenant.slug}-app.styll.it/prenota`

  return (
    <section
      id="hero"
      aria-label="Presentazione"
      className="relative flex min-h-screen flex-col overflow-hidden bg-[#111]"
    >
      {/* Background image */}
      {tenant.hero_image_url && (
        <Image
          fill
          priority
          src={tenant.hero_image_url}
          alt=""
          className="object-cover object-center"
          sizes="100vw"
        />
      )}

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-[1]"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0) 55%)',
        }}
      />

      {/* Content */}
      <div
        className="relative z-10 flex flex-1 flex-col justify-end px-5 sm:px-10"
        style={{ paddingTop: 120, paddingBottom: '5rem' }}
      >
        <div className="w-full max-w-[1120px] mx-auto">

          {/* Google rating badge */}
          {tenant.google_rating != null && (
            <div className="mb-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
              <span className="text-yellow-400 text-sm" aria-hidden="true">★</span>
              <span className="text-white font-bold text-sm">{tenant.google_rating}</span>
              {tenant.google_reviews_count != null && (
                <span className="text-white/55 text-sm">({tenant.google_reviews_count} recensioni)</span>
              )}
            </div>
          )}

          {/* Tagline — big title chosen by the barber */}
          {tagline && (
            <h1
              className="mb-5 font-black text-white"
              style={{
                fontSize: 'clamp(40px, 7.5vw, 88px)',
                lineHeight: 0.92,
                letterSpacing: '-0.025em',
              }}
            >
              {tagline}
            </h1>
          )}

          {/* Description — smaller paragraph */}
          {description && (
            <p
              className="mb-10 text-white/65 leading-relaxed max-w-sm"
              style={{ fontSize: 'clamp(14px, 2vw, 17px)' }}
            >
              {description.length > 130 ? description.slice(0, 130) + '…' : description}
            </p>
          )}

          {/* Spacer when no text at all */}
          {!tagline && !description && <div className="mb-10" />}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={bookingUrl}
              className="inline-flex items-center gap-2 font-bold text-sm no-underline rounded-full bg-white text-[#111] hover:bg-white/90 transition-colors"
              style={{ padding: '14px 28px' }}
            >
              Prenota ora
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            <a
              href="#sedi"
              className="inline-flex items-center gap-2 font-bold text-sm no-underline rounded-full text-white border border-white/30 hover:bg-white/10 transition-colors"
              style={{ padding: '14px 28px' }}
            >
              Contattaci
            </a>
          </div>

          </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="lp-scroll-indicator absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 md:flex z-10"
        aria-hidden="true"
      >
        <span className="text-white/50 text-[10px] tracking-[0.15em] uppercase">Scroll</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" opacity="0.5">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </section>
  )
}
