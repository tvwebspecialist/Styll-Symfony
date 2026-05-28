'use client'

import { useState } from 'react'
import { ArrowRight, MapPin } from 'lucide-react'
import AnimatedSection from './AnimatedSection'
import AnimatedList from './AnimatedList'
import type { LandingLocation } from '@/types/landing'

interface Props {
  locations: LandingLocation[]
  isMultiple: boolean
  locationsDescription?: string | null
  primaryColor?: string
}

function buildMapsUrl(loc: LandingLocation): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
  }
  if (loc.address || loc.city) {
    return `https://maps.google.com/?q=${encodeURIComponent(
      [loc.address, loc.city].filter(Boolean).join(', ')
    )}`
  }
  return null
}

// ── CTA pill button (single-location hero) ────────────────────────────────────

function CTAPill({ url, primaryColor = '#0A0A0A' }: { url: string; primaryColor?: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center no-underline w-fit"
      style={{
        padding: '14px 14px 14px 24px',
        background: 'white',
        color: '#0A0A0A',
        borderRadius: 9999,
        fontSize: 15,
        fontWeight: 600,
        gap: 12,
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        transition: 'transform 0.2s ease',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      Scopri come raggiungerci
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: primaryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ArrowRight size={16} color="white" strokeWidth={2.5} />
      </span>
    </a>
  )
}

// ── Single location (full-bleed hero) ─────────────────────────────────────────

function SingleLocation({ loc, primaryColor }: { loc: LandingLocation; primaryColor?: string }) {
  const mapsUrl = buildMapsUrl(loc)
  const coverPhoto = loc.photos?.[0] ?? loc.photo_url ?? null

  return (
    <AnimatedSection direction="up">
      <section
        id="sedi"
        aria-label="Dove siamo"
        className="relative w-full overflow-hidden bg-[#111] h-[100vw] min-h-[400px] md:h-[700px]"
      >
        {coverPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto}
            alt={loc.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            aria-hidden="true"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.60)' }}
          aria-hidden="true"
        />
        <div className="relative z-10 flex flex-col justify-center h-full w-full max-w-[1120px] mx-auto px-5 py-20">
          <h2
            className="font-black text-white mb-8 max-w-xl"
            style={{
              fontSize: 'clamp(32px, 5.5vw, 64px)',
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
            }}
          >
            Quella che noi<br />chiamiamo Casa
          </h2>
          {mapsUrl && <CTAPill url={mapsUrl} primaryColor={primaryColor} />}
        </div>
      </section>
    </AnimatedSection>
  )
}

// ── Location card (multi-sede grid) ──────────────────────────────────────────

function LocationCard({
  location,
  primaryColor,
}: {
  location: LandingLocation
  primaryColor?: string
}) {
  const [hovered, setHovered] = useState(false)
  const coverPhoto = location.photos?.[0] ?? location.photo_url ?? null
  const mapsUrl = buildMapsUrl(location)

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        aspectRatio: '4 / 3',
        background: '#1A1A1A',
        boxShadow: hovered
          ? '0 16px 48px rgba(0,0,0,0.18)'
          : '0 4px 20px rgba(0,0,0,0.08)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
        willChange: 'transform',
      }}
    >
      {/* Photo with hover zoom */}
      {coverPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverPhoto}
          alt={location.name}
          loading="lazy"
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transform: hovered ? 'scale(1.06)' : 'scale(1)',
            transition: 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          }}
        />
      )}

      {/* Gradient overlay */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 20px 22px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 'clamp(17px, 2.2vw, 22px)',
            fontWeight: 700,
            color: '#fff',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {location.name}
        </h3>

        {(location.address ?? location.city) && (
          <p
            style={{
              margin: '5px 0 0',
              fontSize: 13,
              color: 'rgba(255,255,255,0.65)',
              lineHeight: 1.4,
            }}
          >
            {[location.address, location.city].filter(Boolean).join(', ')}
          </p>
        )}

        {location.phone && (
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
            {location.phone}
          </p>
        )}

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginTop: 11,
              fontSize: 12,
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              background: primaryColor ?? 'rgba(255,255,255,0.18)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              padding: '5px 11px',
              borderRadius: 99,
              letterSpacing: '0.01em',
            }}
          >
            <MapPin size={11} strokeWidth={2.5} aria-hidden="true" />
            Indicazioni
          </a>
        )}
      </div>
    </article>
  )
}

// ── Multi-location grid ───────────────────────────────────────────────────────

function MultiLocationContent({
  locations,
  locationsDescription,
  primaryColor,
}: {
  locations: LandingLocation[]
  locationsDescription?: string | null
  primaryColor?: string
}) {
  const gridClass =
    locations.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'

  return (
    <div className="w-full max-w-[1120px] mx-auto px-5 pt-8 pb-12">
      {/* Header */}
      <div className="text-center mb-6">
        <h2
          className="font-black text-[#0A0A0A]"
          style={{ fontSize: 'clamp(28px, 4.5vw, 48px)', letterSpacing: '-0.025em' }}
        >
          Le nostre sedi
        </h2>
        {locationsDescription && (
          <p
            className="mx-auto max-w-lg"
            style={{ fontSize: 15, color: 'rgba(0,0,0,0.5)', marginTop: 8, marginBottom: 0 }}
          >
            {locationsDescription}
          </p>
        )}
      </div>

      {/* Grid */}
      <AnimatedList staggerDelay={0.07} className={`grid gap-4 ${gridClass}`}>
        {locations.map((loc) => (
          <LocationCard key={loc.id} location={loc} primaryColor={primaryColor} />
        ))}
      </AnimatedList>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LandingLocations({
  locations,
  isMultiple,
  locationsDescription,
  primaryColor,
}: Props) {
  if (locations.length === 0) return null

  if (!isMultiple) {
    return <SingleLocation loc={locations[0]!} primaryColor={primaryColor} />
  }

  return (
    <section id="sedi" aria-label="Le nostre sedi" className="w-full bg-white">
      <AnimatedSection direction="up">
        <MultiLocationContent
          locations={locations}
          locationsDescription={locationsDescription}
          primaryColor={primaryColor}
        />
      </AnimatedSection>
    </section>
  )
}

