import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { PublicWebsitePhoto } from '@/lib/actions/public-booking'

interface Props {
  websitePhotos: PublicWebsitePhoto[]
}

export default function LandingGallery({ websitePhotos }: Props) {
  if (websitePhotos.length < 2) return null

  const photos = websitePhotos.slice(0, 9)

  // Build a masonry-like layout:
  // Row 1: first photo large (col-span 2) + second photo small
  // Row 2: three equal photos
  // Row 3 (if exists): first small + second large (col-span 2)
  const row1 = photos.slice(0, 3)
  const row2 = photos.slice(3, 6)
  const row3 = photos.slice(6, 9)

  return (
    <section
      aria-label="Galleria"
      id="galleria"
      data-reveal
      style={
        {
          background: '#F4F4F4',
          padding: 'clamp(5rem, 10vw, 8rem) 0',
        } as CSSProperties
      }
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 'clamp(2.5rem, 5vw, 4rem)',
          }}
        >
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
              Portfolio
            </span>
            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#111111',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
              }}
            >
              Il nostro lavoro
            </h2>
          </div>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#888',
              maxWidth: 220,
              lineHeight: 1.55,
              textAlign: 'right',
            }}
          >
            Ogni taglio è un&apos;opera unica.
          </p>
        </div>

        {/* Row 1 — large + small */}
        {row1.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: 10,
              marginBottom: 10,
            }}
            className="max-sm:!grid-cols-1"
          >
            <div
              style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '16/9',
                background: '#DDD',
              } as CSSProperties}
            >
              <Image
                fill
                src={row1[0].url}
                alt="Lavori del salone"
                className="lp-gallery-img object-cover"
                sizes="(max-width: 768px) 100vw, 66vw"
                priority
              />
            </div>

            {row1[1] && (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '3/4',
                  background: '#DDD',
                } as CSSProperties}
                className="max-sm:hidden"
              >
                <Image
                  fill
                  src={row1[1].url}
                  alt="Lavori del salone"
                  className="lp-gallery-img object-cover"
                  sizes="33vw"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}

        {/* Row 2 — three equal */}
        {row2.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              marginBottom: 10,
            }}
            className="max-sm:!grid-cols-2"
          >
            {row2.map((photo) => (
              <div
                key={photo.id}
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '1/1',
                  background: '#DDD',
                } as CSSProperties}
              >
                <Image
                  fill
                  src={photo.url}
                  alt="Lavori del salone"
                  className="lp-gallery-img object-cover"
                  sizes="(max-width: 768px) 50vw, 33vw"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        )}

        {/* Row 3 — small + large */}
        {row3.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: 10,
            }}
            className="max-sm:!grid-cols-1"
          >
            {row3[0] && (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '3/4',
                  background: '#DDD',
                } as CSSProperties}
                className="max-sm:hidden"
              >
                <Image
                  fill
                  src={row3[0].url}
                  alt="Lavori del salone"
                  className="lp-gallery-img object-cover"
                  sizes="33vw"
                  loading="lazy"
                />
              </div>
            )}

            {row3[1] && (
              <div
                style={{
                  position: 'relative',
                  borderRadius: 20,
                  overflow: 'hidden',
                  aspectRatio: '16/9',
                  background: '#DDD',
                } as CSSProperties}
              >
                <Image
                  fill
                  src={row3[1].url}
                  alt="Lavori del salone"
                  className="lp-gallery-img object-cover"
                  sizes="(max-width: 768px) 100vw, 66vw"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
