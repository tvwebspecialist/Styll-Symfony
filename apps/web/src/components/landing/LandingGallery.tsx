import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { PublicWebsitePhoto } from '@/lib/actions/public-booking'

interface Props {
  websitePhotos: PublicWebsitePhoto[]
}

export default function LandingGallery({ websitePhotos }: Props) {
  if (websitePhotos.length < 2) return null

  const photos = websitePhotos.slice(0, 9)

  return (
    <section
      aria-label="Galleria"
      style={{ background: '#F9FAFB', padding: 'clamp(4rem, 8vw, 7rem) 0' } as CSSProperties}
    >
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        <div style={{ marginBottom: 40 }}>
          <h2
            style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em', margin: 0 }}
          >
            Il nostro lavoro
          </h2>
          <p style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: 8 }}>Ogni taglio è unico.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 } as CSSProperties}>
          {photos.map((photo, index) => {
            const isFirst = index === 0
            return (
              <div
                key={photo.id}
                style={{
                  gridColumn: isFirst ? 'span 2' : 'span 1',
                  position: 'relative',
                  aspectRatio: isFirst ? '16/10' : '1/1',
                  borderRadius: 16,
                  overflow: 'hidden',
                  background: '#E5E7EB',
                } as CSSProperties}
              >
                <Image
                  fill
                  src={photo.url}
                  alt="Foto salone"
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes={isFirst ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 50vw, 33vw'}
                  loading={isFirst ? 'eager' : 'lazy'}
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
