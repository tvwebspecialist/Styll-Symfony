import Image from 'next/image'
import Link from 'next/link'
import type { LandingTenant } from '@/types/landing'

interface Props {
  tenant: LandingTenant
}

export default function LandingAbout({ tenant }: Props) {
  if (!tenant.description?.trim()) return null

  const hasImage = Boolean(tenant.about_image_url)

  return (
    <section
      id="chi-siamo"
      aria-label="Chi siamo"
      className="w-full bg-white py-20 sm:py-24"
    >
      <div className="w-full max-w-[1120px] mx-auto px-5">
        <div
          className={`grid items-center gap-12 lg:gap-20 ${
            hasImage ? 'grid-cols-1 lg:grid-cols-[1fr_420px]' : 'grid-cols-1 max-w-2xl'
          }`}
        >

          {/* Text column */}
          <div>
            <p
              className="font-bold uppercase tracking-[0.14em] text-xs mb-5"
              style={{ color: 'var(--brand-primary)' }}
            >
              Chi siamo
            </p>
            <h2
              className="font-black text-[#111] mb-6 leading-tight"
              style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', letterSpacing: '-0.025em' }}
            >
              {tenant.business_name}
            </h2>
            <p className="text-[#666] leading-relaxed mb-10 max-w-lg" style={{ fontSize: '16px' }}>
              {tenant.description}
            </p>
            <Link
              href="#sedi"
              className="inline-flex items-center gap-2 font-semibold text-sm no-underline text-white rounded-full transition-colors hover:opacity-90"
              style={{ background: '#111', padding: '13px 26px' }}
            >
              Contattaci
            </Link>
          </div>

          {/* Image column */}
          {tenant.about_image_url && (
            <div
              className="relative overflow-hidden rounded-2xl w-full"
              style={{ aspectRatio: '4/5' }}
            >
              <Image
                src={tenant.about_image_url}
                alt={`${tenant.business_name} — il salone`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 420px"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
