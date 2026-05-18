import Image from 'next/image'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation, PublicPortfolioPhoto } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  portfolio: PublicPortfolioPhoto[]
  firstLocation: PublicLocation | null
}

export default function LandingAbout({ tenant, portfolio, firstLocation }: Props) {
  const bio = (tenant.settings?.bio as string | undefined) ?? null
  if (!bio?.trim()) return null

  const imageUrl = portfolio[1]?.photo_url ?? firstLocation?.photo_url ?? null
  const displayBio = bio.length > 300 ? bio.slice(0, 300) : bio

  return (
    <section
      aria-label="Chi siamo"
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{ background: 'var(--landing-surface)' }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h2
              className="mb-6 font-bold leading-tight tracking-[-0.02em]"
              style={{
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: 'var(--landing-text-primary)',
              }}
            >
              Il tuo barbiere
            </h2>
            <p
              className="leading-relaxed"
              style={{
                color: 'var(--landing-text-muted)',
                fontSize: '1rem',
                lineHeight: '1.6',
              }}
            >
              {displayBio}
            </p>
          </div>

          {imageUrl && (
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src={imageUrl}
                alt={`${tenant.business_name} — foto`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
