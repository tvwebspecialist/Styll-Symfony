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
      data-reveal
      style={
        {
          background: '#FFFFFF',
          padding: 'clamp(5rem, 10vw, 8rem) 0',
        } as CSSProperties
      }
    >
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 48px)',
        }}
      >
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
              {title || 'Il tuo barbiere di fiducia'}
            </h2>

            <div
              style={{
                width: 48,
                height: 3,
                background: 'var(--brand-primary)',
                borderRadius: 99,
                marginBottom: 28,
              }}
              aria-hidden="true"
            />

            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.85,
                color: '#555555',
                maxWidth: 500,
              }}
            >
              {text}
            </p>

            {/* Feature bullets */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { icon: '✂', label: 'Taglio professionale su misura' },
                { icon: '⭐', label: 'Esperienza e cura del dettaglio' },
                { icon: '📅', label: 'Prenotazione online in 1 minuto' },
              ].map((item) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'color-mix(in srgb, var(--brand-primary) 10%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#333' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image column */}
          {imageUrl && (
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -16,
                  borderRadius: 36,
                  background: 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
                  zIndex: 0,
                }}
                aria-hidden="true"
              />
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  borderRadius: 28,
                  overflow: 'hidden',
                  aspectRatio: '4/5',
                  boxShadow: '0 32px 64px rgba(0,0,0,0.14)',
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
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 55%)',
                  }}
                />
              </div>

              {/* Floating badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -20,
                  right: -20,
                  zIndex: 2,
                  background: '#FFFFFF',
                  borderRadius: 16,
                  padding: '14px 20px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--brand-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  ✂
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#111', lineHeight: 1.2 }}>
                    Prenota ora
                  </p>
                  <p style={{ fontSize: 11, color: '#888', marginTop: 2 }}>In 1 minuto</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
