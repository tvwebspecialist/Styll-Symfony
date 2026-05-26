import type { CSSProperties } from 'react'
import type { PublicLocation } from '@/lib/actions/public-booking'

interface Props {
  locations: PublicLocation[]
}

function buildMapsUrl(loc: PublicLocation): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
  }
  if (loc.address || loc.city) {
    return `https://maps.google.com/?q=${encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))}`
  }
  return null
}

function buildEmbedUrl(loc: PublicLocation): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=${loc.latitude},${loc.longitude}`
  }
  if (loc.address || loc.city) {
    const q = encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))
    return `https://maps.google.com/maps?q=${q}&output=embed`
  }
  return null
}

function SingleLocationVersion({ loc }: { loc: PublicLocation }) {
  const mapsUrl = buildMapsUrl(loc)
  const embedUrl = buildEmbedUrl(loc)
  const address = [loc.address, loc.city].filter(Boolean).join(', ')

  return (
    <section
      id="sedi"
      aria-label="Dove siamo"
      style={{
        background: '#1A1A1A',
        padding: 'clamp(5rem, 10vw, 8rem) 0',
      } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(3rem, 6vw, 5rem)',
            alignItems: 'center',
          }}
        >
          {/* Left: info */}
          <div data-reveal>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: 'var(--brand-primary)',
                marginBottom: 14,
              }}
            >
              Vieni a trovarci
            </span>

            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                marginBottom: 32,
              }}
            >
              {loc.name}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {address && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" aria-hidden="true">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                      <circle cx="12" cy="9" r="2.5" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                      Indirizzo
                    </p>
                    <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                      {address}
                    </p>
                  </div>
                </div>
              )}

              {loc.phone && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" aria-hidden="true">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 .21h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7a2 2 0 011.72 2.01z" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                      Telefono
                    </p>
                    <a
                      href={`tel:${loc.phone}`}
                      style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' } as CSSProperties}
                    >
                      {loc.phone}
                    </a>
                  </div>
                </div>
              )}

              {loc.email && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-primary)" strokeWidth="2" aria-hidden="true">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                      Email
                    </p>
                    <a
                      href={`mailto:${loc.email}`}
                      style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none' } as CSSProperties}
                    >
                      {loc.email}
                    </a>
                  </div>
                </div>
              )}

              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                    padding: '11px 20px',
                    borderRadius: 999,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.7)',
                    textDecoration: 'none',
                    width: 'fit-content',
                    transition: 'border-color 0.2s, color 0.2s',
                  } as CSSProperties}
                >
                  Apri in Google Maps
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Right: map embed */}
          {embedUrl ? (
            <div
              data-reveal
              data-reveal-delay="100"
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '4/3',
                boxShadow: '0 32px 64px rgba(0,0,0,0.4)',
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <iframe
                title={`Mappa di ${loc.name}`}
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 0, position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : loc.photo_url || (loc.photos?.[0]) ? (
            <div
              data-reveal
              data-reveal-delay="100"
              style={{
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '4/3',
                position: 'relative',
              }}
            >
              <img
                src={loc.photos?.[0] || loc.photo_url || ''}
                alt={loc.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="lazy"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function MultipleLocationsVersion({ locations }: { locations: PublicLocation[] }) {
  return (
    <section
      id="sedi"
      aria-label="Le nostre sedi"
      style={{
        background: '#F5F5F5',
        padding: 'clamp(5rem, 10vw, 8rem) 0',
      } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div data-reveal style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--brand-primary)',
              marginBottom: 14,
            }}
          >
            Vieni a trovarci
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
            Le nostre sedi
          </h2>
        </div>

        {/* Location cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
          }}
        >
          {locations.map((loc, index) => {
            const coverPhoto = loc.photos?.[0] || loc.photo_url || null
            const mapsUrl = buildMapsUrl(loc)
            const address = [loc.address, loc.city].filter(Boolean).join(', ')

            return (
              <article
                key={loc.id}
                data-reveal
                data-reveal-delay={String(index * 80)}
                className="lp-location-card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 20,
                  overflow: 'hidden',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                } as CSSProperties}
              >
                {/* Cover photo */}
                <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden', background: '#E5E5E5' }}>
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={loc.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                    />
                  ) : (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" aria-hidden="true">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                        <circle cx="12" cy="9" r="2.5" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div style={{ padding: '20px 22px 24px' }}>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 800,
                      color: '#111111',
                      marginBottom: 8,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {loc.name}
                  </h3>

                  {address && (
                    <p style={{ fontSize: '0.82rem', color: '#888888', marginBottom: 6, lineHeight: 1.5 }}>
                      {address}
                    </p>
                  )}

                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone}`}
                      style={{ display: 'block', fontSize: '0.82rem', color: '#888888', textDecoration: 'none', marginBottom: 16 } as CSSProperties}
                    >
                      {loc.phone}
                    </a>
                  )}

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--brand-primary)',
                        textDecoration: 'none',
                      } as CSSProperties}
                    >
                      Apri in Maps
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default function LandingLocations({ locations }: Props) {
  if (locations.length === 0) return null

  if (locations.length === 1) {
    return <SingleLocationVersion loc={locations[0]!} />
  }

  return <MultipleLocationsVersion locations={locations} />
}
