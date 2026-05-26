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

  if (!text?.trim() && !title?.trim()) return null

  return (
    <section
      aria-label="Chi siamo"
      style={{ background: '#FFFFFF', padding: 'clamp(4rem, 8vw, 7rem) 0' } as CSSProperties}
    >
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(2rem, 5vw, 4rem)', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: tenant.primary_color ?? '#1a1a1a' }}>
              Chi siamo
            </span>
            <h2 style={{ marginTop: 10, marginBottom: 20, fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#111111', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {title || 'Il tuo barbiere di fiducia'}
            </h2>
            <p style={{ fontSize: '1rem', lineHeight: 1.7, color: '#4B5563' }}>
              {text}
            </p>
          </div>

          {imageUrl && (
            <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', aspectRatio: '4/5' }}>
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
