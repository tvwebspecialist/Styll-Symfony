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
      style={{ background: '#F9FAFB', padding: 'clamp(4rem, 8vw, 7rem) 0' } as CSSProperties}
    >
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, color: '#111111', letterSpacing: '-0.02em', margin: 0 }}>
            {locations.length === 1 ? 'Dove siamo' : 'Le nostre sedi'}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {locations.map((loc) => {
            const hasCoordinates = loc.latitude !== null && loc.latitude !== undefined && loc.longitude !== null && loc.longitude !== undefined
            const mapsUrl = hasCoordinates
              ? `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
              : loc.address
                ? `https://maps.google.com/?q=${encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))}`
                : null

            return (
              <div
                key={loc.id}
                style={{ background: '#FFFFFF', borderRadius: 20, padding: 24, border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#111111' }}>{loc.name}</h3>
                {(loc.address || loc.city) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <MapPin size={15} style={{ color: '#9CA3AF', marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#4B5563' }}>{[loc.address, loc.city].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                {loc.phone && (
                  <a href={`tel:${loc.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <Phone size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#4B5563' }}>{loc.phone}</span>
                  </a>
                )}
                {loc.email && (
                  <a href={`mailto:${loc.email}`} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                    <Mail size={15} style={{ color: '#9CA3AF', flexShrink: 0 }} />
                    <span style={{ fontSize: 14, color: '#4B5563' }}>{loc.email}</span>
                  </a>
                )}
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, padding: '8px 14px', background: '#111111', color: '#FFFFFF', borderRadius: 100, fontSize: 13, fontWeight: 600, textDecoration: 'none', width: 'fit-content' }}
                  >
                    Apri in Maps →
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
