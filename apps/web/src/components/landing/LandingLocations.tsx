import type { CSSProperties } from 'react'
import type { PublicLocation } from '@/lib/actions/public-booking'

interface Props {
  locations: PublicLocation[]
}

export default function LandingLocations({ locations }: Props) {
  if (locations.length === 0) return null

  return (
    <section
      aria-label="Sedi"
      style={{ background: '#0F0F0F', padding: 'clamp(5rem, 10vw, 8rem) 0', overflow: 'hidden' } as CSSProperties}
    >
      <style>{`
        .lp-locations-track {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          gap: 24px;
          padding: 0 calc(50vw - 312px);
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .lp-locations-track::-webkit-scrollbar { display: none; }
        .lp-loc-card {
          scroll-snap-align: center;
          flex-shrink: 0;
          width: 624px;
          aspect-ratio: 16/9;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          background: #1a1a1a;
        }
        @media (max-width: 768px) {
          .lp-locations-track { padding: 0 20px; }
          .lp-loc-card { width: calc(100vw - 40px); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          maxWidth: 1120,
          margin: '0 auto',
          padding: '0 clamp(20px, 5vw, 48px)',
          marginBottom: 'clamp(2.5rem, 5vw, 3.5rem)',
        }}
      >
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
          Vieni a trovarci
        </span>
        <h2
          style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
          }}
        >
          {locations.length === 1 ? 'Dove siamo' : 'Le nostre sedi'}
        </h2>
      </div>

      {/* Scroll track */}
      <div className="lp-locations-track">
        {locations.map((loc) => {
          const hasCoords = loc.latitude != null && loc.longitude != null
          const mapsUrl = hasCoords
            ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
            : loc.address
              ? `https://maps.google.com/?q=${encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))}`
              : null

          return (
            <div key={loc.id} className="lp-loc-card">
              {/* Background photo or placeholder */}
              {loc.photo_url ? (
                <img
                  src={loc.photo_url}
                  alt={loc.name}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
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
                  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                </div>
              )}

              {/* Bottom gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 45%, transparent 70%)',
                }}
                aria-hidden="true"
              />

              {/* Text + Maps button */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '0 28px 26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      lineHeight: 1.25,
                      marginBottom: 6,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {loc.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(loc.address || loc.city) && (
                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'rgba(255,255,255,0.65)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {[loc.address, loc.city].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {loc.phone && (
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                        {loc.phone}
                      </p>
                    )}
                  </div>
                </div>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'rgba(255,255,255,0.95)',
                      color: '#111111',
                      borderRadius: 99,
                      padding: '9px 16px',
                      fontSize: 12,
                      fontWeight: 700,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                    } as CSSProperties}
                  >
                    Apri in Maps
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
