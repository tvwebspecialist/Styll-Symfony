import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { TenantBranding } from '@/lib/tenant'
import type { PublicLocation, PublicWebsitePhoto } from '@/lib/actions/public-booking'

interface AboutData {
  title?: string
  text?: string
  image_url?: string
}

interface Props {
  tenant: TenantBranding
  websitePhotos: PublicWebsitePhoto[]
  firstLocation: PublicLocation | null
  aboutData?: AboutData
}

export default function LandingAbout({ tenant, websitePhotos, firstLocation, aboutData }: Props) {
  const title = aboutData?.title?.trim() || null
  const text = aboutData?.text?.trim() || (tenant.settings?.bio as string | undefined)?.trim() || null
  const imageUrl = aboutData?.image_url?.trim() || websitePhotos[1]?.url || firstLocation?.photo_url || null

  if (!title && !text) return null

  return (
    <section
      aria-label="Chi siamo"
      data-reveal
      style={{ background: '#FFFFFF', padding: 'clamp(5rem, 10vw, 8rem) 0' } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: imageUrl ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
            gap: 'clamp(3rem, 6vw, 5rem)',
            alignItems: 'center',
          }}
        >
          {/* Text column */}
          <div>
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
              Chi siamo
            </span>

            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#111111',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: 24,
              }}
            >
              {title || tenant.business_name}
            </h2>

            <div
              style={{ width: 48, height: 3, background: 'var(--brand-primary)', borderRadius: 99, marginBottom: 28 }}
              aria-hidden="true"
            />

            {text && (
              <p style={{ fontSize: '1.05rem', lineHeight: 1.85, color: '#555555', maxWidth: 500 }}>
                {text}
              </p>
            )}
          </div>

          {/* Image column */}
          {imageUrl && (
            <div>
              <div
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  aspectRatio: '4/5',
                  boxShadow: '0 32px 64px rgba(0,0,0,0.14)',
                  position: 'relative',
                }}
              >
                <Image
                  src={imageUrl}
                  alt={`${tenant.business_name} — salone`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
