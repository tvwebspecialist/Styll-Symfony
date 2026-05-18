import Image from 'next/image'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicPortfolioPhoto } from '@/lib/actions/public-booking'

interface Props {
  tenant: TenantBranding
  portfolio: PublicPortfolioPhoto[]
}

export default function LandingGallery({ tenant, portfolio }: Props) {
  if (portfolio.length < 2) return null

  const photos = portfolio.slice(0, 9)
  const galleryTitle = (tenant.settings?.gallery_title as string | undefined) ?? 'Il nostro lavoro'

  return (
    <section
      aria-label="Galleria lavori"
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{ background: 'var(--landing-bg)' }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mb-10">
          <h2
            className="mb-2 font-bold tracking-[-0.02em]"
            style={{
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              color: 'var(--landing-text-primary)',
            }}
          >
            {galleryTitle}
          </h2>
          <p className="text-sm" style={{ color: 'var(--landing-text-muted)' }}>
            Ogni taglio è unico.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
          {photos.map((photo, index) => {
            const isFirst = index === 0
            return (
              <div
                key={photo.id}
                className={`group relative overflow-hidden rounded-lg ${isFirst ? 'col-span-2' : ''}`}
                style={{ aspectRatio: isFirst ? '16/10' : '1/1' }}
              >
                <Image
                  fill
                  src={photo.photo_url}
                  alt="Lavoro barbiere"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes={
                    isFirst
                      ? '(max-width: 768px) 100vw, 66vw'
                      : '(max-width: 768px) 50vw, 33vw'
                  }
                  loading={isFirst ? 'eager' : 'lazy'}
                />
                {photo.service_tags && photo.service_tags.length > 0 && (
                  <div className="absolute inset-0 flex items-end bg-black/0 p-3 opacity-0 transition-all duration-300 group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
                      {photo.service_tags[0]}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
