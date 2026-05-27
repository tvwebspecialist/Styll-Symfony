'use client'

import { useRef, useState } from 'react'
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import AnimatedSection from './AnimatedSection'
import type { LandingLocation } from '@/types/landing'

interface Props {
  locations: LandingLocation[]
  isMultiple: boolean
  locationsDescription?: string | null
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

// ── CTA pill button ───────────────────────────────────────────────────────────

function CTAPill({ url }: { url: string }) {
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
          background: '#0A0A0A',
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

// ── Single location ───────────────────────────────────────────────────────────

function SingleLocation({ loc }: { loc: LandingLocation }) {
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
          {mapsUrl && <CTAPill url={mapsUrl} />}
        </div>
      </section>
    </AnimatedSection>
  )
}

// ── Stack card (desktop) ───────────────────────────────────────────────────────

interface StackCardProps {
  location: LandingLocation
  index: number
  total: number
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress']
}

function LocationStackCard({ location, index, total, scrollYProgress }: StackCardProps) {
  const cardStep = 1 / total
  const cardStart = index * cardStep
  const cardEnd = (index + 1) * cardStep
  const enterEnd = cardStart + cardStep * 0.4

  // Slide up from below, then freeze
  const y = useTransform(
    scrollYProgress,
    [cardStart, enterEnd, cardEnd],
    ['100vh', '0vh', '0vh']
  )

  // Last card never scales down (nothing covers it)
  const scaleFrom = Math.max(cardStart, cardEnd - cardStep * 0.15)
  const scale = useTransform(
    scrollYProgress,
    [scaleFrom, cardEnd],
    index < total - 1 ? [1, 0.94] : [1, 1]
  )

  const coverPhoto = location.photos?.[0] ?? location.photo_url ?? null

  return (
    <motion.div
      style={{ y, scale, zIndex: index + 1, willChange: 'transform' }}
      className="absolute inset-0 flex items-center justify-center px-6 py-6"
    >
      <div
        className="relative w-full overflow-hidden rounded-[20px]"
        style={{ maxWidth: '90vw', height: '84vh', margin: '0 auto' }}
      >
        {coverPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto}
            alt={location.name}
            className="absolute inset-0 w-full h-full object-cover"
            loading={index < 2 ? 'eager' : 'lazy'}
            aria-hidden="true"
          />
        ) : (
          <div className="absolute inset-0 bg-[#1A1A1A]" />
        )}

        {/* Overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(0,0,0,0.38)' }}
          aria-hidden="true"
        />

        {/* Name — centered */}
        <div className="absolute inset-0 flex items-center justify-center px-8">
          <h3
            className="font-black text-white text-center"
            style={{
              fontSize: 'clamp(40px, 6vw, 80px)',
              letterSpacing: '-1px',
              textShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}
          >
            {location.name}
          </h3>
        </div>

        {/* Info — bottom left */}
        {(location.address ?? location.city ?? location.phone) && (
          <div className="absolute bottom-8 left-8">
            {(location.address ?? location.city) && (
              <p className="text-white m-0" style={{ fontSize: 15, opacity: 0.8 }}>
                {[location.address, location.city].filter(Boolean).join(', ')}
              </p>
            )}
            {location.phone && (
              <p className="text-white m-0 mt-0.5" style={{ fontSize: 15, opacity: 0.8 }}>
                {location.phone}
              </p>
            )}
          </div>
        )}

        {/* Counter — bottom right */}
        <div
          className="absolute bottom-8 right-8 text-white"
          style={{ fontSize: 13, fontWeight: 500, opacity: 0.45, letterSpacing: '0.06em' }}
        >
          {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </div>
      </div>
    </motion.div>
  )
}

// ── Desktop sticky stack content ──────────────────────────────────────────────

function DesktopStackContent({
  locations,
  locationsDescription,
}: {
  locations: LandingLocation[]
  locationsDescription?: string | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <>
      {/* Section header — scrolls normally before sticky kicks in */}
      <div className="w-full max-w-[1120px] mx-auto px-5 pt-20 pb-16 text-center">
        <h2
          className="font-black text-[#0A0A0A]"
          style={{ fontSize: 'clamp(32px, 4.5vw, 48px)', letterSpacing: '-0.025em' }}
        >
          Le nostre sedi
        </h2>
        {locationsDescription && (
          <p
            className="mt-2 mx-auto max-w-lg"
            style={{ fontSize: 16, color: 'rgba(0,0,0,0.5)', margin: '8px auto 0' }}
          >
            {locationsDescription}
          </p>
        )}
      </div>

      {/* Sticky scroll container — one 100vh step per location */}
      <div
        ref={containerRef}
        className="relative"
        style={{ height: `${locations.length * 100}vh` }}
      >
        <div className="sticky top-0 h-screen overflow-hidden bg-[#111]">
          {locations.map((loc, i) => (
            <LocationStackCard
              key={loc.id}
              location={loc}
              index={i}
              total={locations.length}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Mobile simple stack content ────────────────────────────────────────────────

function MobileStackContent({
  locations,
  locationsDescription,
}: {
  locations: LandingLocation[]
  locationsDescription?: string | null
}) {
  return (
    <>
      <div className="w-full max-w-[1120px] mx-auto px-5 pt-12 pb-8 text-center">
        <h2
          className="font-black text-[#0A0A0A]"
          style={{ fontSize: 'clamp(28px, 6vw, 40px)', letterSpacing: '-0.02em' }}
        >
          Le nostre sedi
        </h2>
        {locationsDescription && (
          <p className="mt-2" style={{ fontSize: 15, color: 'rgba(0,0,0,0.5)' }}>
            {locationsDescription}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-4 px-5 pb-12 max-w-[1120px] mx-auto w-full">
        {locations.map((loc) => {
          const coverPhoto = loc.photos?.[0] ?? loc.photo_url ?? null
          return (
            <div
              key={loc.id}
              className="relative overflow-hidden rounded-2xl bg-[#1A1A1A]"
              style={{ aspectRatio: '16/9' }}
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
                style={{ background: 'rgba(0,0,0,0.42)' }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <h3
                  className="font-black text-white text-center"
                  style={{ fontSize: 'clamp(24px, 6vw, 40px)', letterSpacing: '-0.5px' }}
                >
                  {loc.name}
                </h3>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function LandingLocations({ locations, isMultiple, locationsDescription }: Props) {
  const prefersReducedMotion = useReducedMotion()

  if (locations.length === 0) return null

  if (!isMultiple) {
    return <SingleLocation loc={locations[0]!} />
  }

  // Reduced-motion: always use the simple stack
  if (prefersReducedMotion) {
    return (
      <section id="sedi" aria-label="Le nostre sedi" className="w-full bg-white">
        <MobileStackContent locations={locations} locationsDescription={locationsDescription} />
      </section>
    )
  }

  return (
    <section id="sedi" aria-label="Le nostre sedi" className="w-full bg-white">
      {/* Desktop sticky scroll — hidden on mobile via CSS (SSR-safe) */}
      <div className="hidden md:block">
        <DesktopStackContent locations={locations} locationsDescription={locationsDescription} />
      </div>

      {/* Mobile simple stack — visible only on mobile */}
      <div className="md:hidden">
        <MobileStackContent locations={locations} locationsDescription={locationsDescription} />
      </div>
    </section>
  )
}
