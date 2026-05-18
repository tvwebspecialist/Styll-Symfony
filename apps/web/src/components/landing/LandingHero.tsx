import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation, PublicPortfolioPhoto } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  firstLocation: PublicLocation | null
  portfolio: PublicPortfolioPhoto[]
  slug: string
  servicesCount: number
}

const NOISE_SVG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

export default function LandingHero({ tenant, firstLocation, portfolio, slug: _slug, servicesCount }: Props) {
  const heroUrl = portfolio[0]?.photo_url ?? firstLocation?.photo_url ?? null
  const bio = (tenant.settings?.bio as string | undefined) ?? null

  return (
    <section
      aria-label="Presentazione"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden"
      style={{ background: '#0a0a0a' }}
    >
      {/* ── Livello 1: foto reale ── */}
      {heroUrl && (
        <>
          <Image
            fill
            priority
            src={heroUrl}
            alt=""
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/55" />
        </>
      )}

      {/* ── Livello 3: fallback CSS generativo (solo se nessuna foto) ── */}
      {!heroUrl && (
        <>
          {/* Gradient radiale brand */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 80% 60% at 20% 50%, var(--brand-primary) 0%, transparent 60%),
                radial-gradient(ellipse 60% 80% at 80% 20%, color-mix(in srgb, var(--brand-primary) 40%, transparent) 0%, transparent 50%),
                #0a0a0a
              `,
            }}
          />
          {/* Texture noise */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: NOISE_SVG,
              backgroundRepeat: 'repeat',
              backgroundSize: '200px 200px',
            }}
          />
          {/* Griglia decorativa */}
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `linear-gradient(var(--brand-primary) 1px, transparent 1px), linear-gradient(90deg, var(--brand-primary) 1px, transparent 1px)`,
              backgroundSize: '60px 60px',
            }}
          />
        </>
      )}

      {/* ── Contenuto ── */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-24 sm:px-8">
        {/* Simbolo decorativo (solo fallback, visibile dietro) */}
        {!heroUrl && (
          <p
            className="pointer-events-none absolute -bottom-8 right-0 select-none font-black leading-none tracking-tighter opacity-[0.07]"
            style={{ color: 'var(--brand-primary)', fontSize: 'clamp(4rem,15vw,10rem)' }}
            aria-hidden="true"
          >
            ✂
          </p>
        )}

        {/* Logo */}
        {tenant.logo_url && (
          <div className="mb-6">
            <Image
              src={tenant.logo_url}
              alt={tenant.business_name}
              width={56}
              height={56}
              className="rounded-xl object-cover"
            />
          </div>
        )}

        {/* Badge città */}
        {firstLocation?.city && (
          <div
            className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium text-white"
            style={{
              background: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            } as CSSProperties}
          >
            <MapPin size={12} />
            {firstLocation.city}
          </div>
        )}

        {/* Nome */}
        <h1
          className="mb-5 font-extrabold leading-[1.05] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
        >
          {tenant.business_name}
        </h1>

        {/* Bio */}
        <p
          className="mb-8 line-clamp-2 leading-relaxed"
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
          }}
        >
          {bio ?? 'Prenota il tuo appuntamento'}
        </p>

        {/* CTA */}
        <Link
          href="#servizi"
          aria-label={`Prenota appuntamento da ${tenant.business_name}`}
          className="inline-flex w-full items-center justify-center rounded-full px-8 py-[14px] text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
          style={{ background: tenant.primary_color ?? '#1a1a1a' }}
        >
          Prenota ora
        </Link>

        {/* KPI */}
        <div className="mt-8 flex flex-wrap gap-5">
          {servicesCount > 0 && (
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
              {servicesCount} {servicesCount === 1 ? 'servizio' : 'servizi'}
            </span>
          )}
          <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.55)' }}>
            Prenota in 1 minuto
          </span>
        </div>
      </div>
    </section>
  )
}
