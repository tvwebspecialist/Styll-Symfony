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

export default function LandingHero({ tenant, firstLocation, portfolio, slug, servicesCount }: Props) {
  const heroUrl = portfolio[0]?.photo_url ?? firstLocation?.photo_url ?? null
  const bio = (tenant.settings?.bio as string | undefined) ?? null

  const fallbackStyle: CSSProperties = !heroUrl
    ? {
        background: `radial-gradient(ellipse at 60% 40%, ${tenant.primary_color}55 0%, #0a0a0a 70%)`,
      }
    : { background: '#0a0a0a' }

  return (
    <section
      aria-label="Presentazione"
      className="relative flex min-h-screen flex-col justify-center overflow-hidden"
      style={fallbackStyle}
    >
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

      <div className="relative z-10 mx-auto w-full max-w-5xl px-5 py-24 sm:px-8">
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

        <h1
          className="mb-5 font-extrabold leading-[1.05] tracking-[-0.03em] text-white"
          style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)' }}
        >
          {tenant.business_name}
        </h1>

        <p
          className="mb-8 line-clamp-2 leading-relaxed"
          style={{
            color: 'rgba(255,255,255,0.75)',
            fontSize: 'clamp(1rem, 2.5vw, 1.125rem)',
          }}
        >
          {bio ?? 'Prenota il tuo appuntamento'}
        </p>

        <Link
          href={`#servizi`}
          aria-label={`Prenota appuntamento da ${tenant.business_name}`}
          className="inline-flex w-full items-center justify-center rounded-full px-8 py-[14px] text-base font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
          style={{ background: tenant.primary_color ?? '#1a1a1a' }}
        >
          Prenota ora
        </Link>

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
