import type { CSSProperties } from 'react'
import { MapPin, Phone, Mail } from 'lucide-react'
import type { PublicLocation } from '@/lib/actions/public-booking'

interface Props {
  locations: PublicLocation[]
}

export default function LandingLocations({ locations }: Props) {
  if (locations.length === 0) return null

  return (
    <section
      aria-label="Sedi"
      data-reveal
      style={
        {
          background: '#FFFFFF',
          padding: 'clamp(5rem, 10vw, 8rem) 0',
        } as CSSProperties
      }
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)' }}>
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
              color: '#111111',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            {locations.length === 1 ? 'Dove siamo' : 'Le nostre sedi'}
          </h2>
        </div>

        {/* Location cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${locations.length === 1 ? '320px' : '260px'}, 1fr))`,
            gap: 20,
          }}
        >
          {locations.map((loc) => {
            const hasCoordinates =
              loc.latitude !== null && loc.latitude !== undefined &&
              loc.longitude !== null && loc.longitude !== undefined
            const mapsUrl = hasCoordinates
              ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
              : loc.address
                ? `https://maps.google.com/?q=${encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))}`
                : null

            return (
              <div
                key={loc.id}
                className="lp-location-card"
                style={{
                  background: '#FAFAFA',
                  borderRadius: 24,
                  padding: '28px 28px 24px',
                  border: '1px solid #ECECEC',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                } as CSSProperties}
              >
                {/* Location name */}
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 14,
                    }}
                    aria-hidden="true"
                  >
                    <MapPin size={18} style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 800,
                      color: '#111111',
                      lineHeight: 1.25,
                    }}
                  >
                    {loc.name}
                  </h3>
                </div>

                {/* Contact details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                  {(loc.address || loc.city) && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <MapPin
                        size={14}
                        style={{ color: '#BBBBBB', marginTop: 3, flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '0.875rem', color: '#555555', lineHeight: 1.5 }}>
                        {[loc.address, loc.city].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}

                  {loc.phone && (
                    <a
                      href={`tel:${loc.phone}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textDecoration: 'none',
                      }}
                    >
                      <Phone size={14} style={{ color: '#BBBBBB', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: '#555555' }}>{loc.phone}</span>
                    </a>
                  )}

                  {loc.email && (
                    <a
                      href={`mailto:${loc.email}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        textDecoration: 'none',
                      }}
                    >
                      <Mail size={14} style={{ color: '#BBBBBB', flexShrink: 0 }} />
                      <span style={{ fontSize: '0.875rem', color: '#555555' }}>{loc.email}</span>
                    </a>
                  )}
                </div>

                {/* Maps CTA */}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '10px 18px',
                      background: '#111111',
                      color: '#FFFFFF',
                      borderRadius: 99,
                      fontSize: 13,
                      fontWeight: 700,
                      textDecoration: 'none',
                      width: 'fit-content',
                      transition: 'background 0.2s ease',
                    } as CSSProperties}
                  >
                    Apri in Maps
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
