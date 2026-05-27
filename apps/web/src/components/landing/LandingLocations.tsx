import type { LandingLocation } from '@/types/landing'

interface Props {
  locations: LandingLocation[]
  isMultiple: boolean
}

function buildMapsUrl(loc: LandingLocation): string | null {
  if (loc.latitude != null && loc.longitude != null) {
    return `https://maps.google.com/?q=${loc.latitude},${loc.longitude}`
  }
  if (loc.address || loc.city) {
    return `https://maps.google.com/?q=${encodeURIComponent([loc.address, loc.city].filter(Boolean).join(', '))}`
  }
  return null
}

function SingleLocation({ loc }: { loc: LandingLocation }) {
  const mapsUrl = buildMapsUrl(loc)
  const coverPhoto = loc.photos?.[0] ?? loc.photo_url ?? null

  return (
    <section
      id="sedi"
      aria-label="Dove siamo"
      className="relative w-full overflow-hidden bg-[#111]"
      style={{ minHeight: '520px' }}
    >
      {/* Background image */}
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

      {/* Dark overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.60)' }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center h-full w-full max-w-[1120px] mx-auto px-5 py-20 sm:py-28">
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

        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-bold text-sm no-underline rounded-full bg-white text-[#111] hover:bg-white/90 transition-colors w-fit"
            style={{ padding: '13px 26px' }}
          >
            Scopri come raggiungerci
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
            </svg>
          </a>
        )}
      </div>
    </section>
  )
}

function MultipleLocations({ locations }: { locations: LandingLocation[] }) {
  return (
    <section id="sedi" aria-label="Le nostre sedi" className="w-full bg-white">
      {/* Section header */}
      <div className="w-full max-w-[1120px] mx-auto px-5 pt-20 sm:pt-24 pb-10">
        <h2
          className="font-black text-[#111]"
          style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            letterSpacing: '-0.02em',
          }}
        >
          Le nostre sedi
        </h2>
      </div>

      {/* Full-width location cards — stacked, no side padding */}
      <div className="flex flex-col">
        {locations.map((loc) => {
          const mapsUrl = buildMapsUrl(loc)
          const coverPhoto = loc.photos?.[0] ?? loc.photo_url ?? null

          return (
            <div
              key={loc.id}
              className="relative w-full overflow-hidden bg-[#222]"
              style={{ height: 'clamp(280px, 40vw, 420px)' }}
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

              {/* Overlay */}
              <div
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.50)' }}
                aria-hidden="true"
              />

              {/* Location name */}
              <div className="absolute inset-0 flex items-center justify-center px-5">
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="no-underline text-center group"
                  >
                    <h3
                      className="font-black text-white text-center group-hover:opacity-80 transition-opacity"
                      style={{
                        fontSize: 'clamp(28px, 5vw, 52px)',
                        letterSpacing: '-0.025em',
                      }}
                    >
                      {loc.name}
                    </h3>
                  </a>
                ) : (
                  <h3
                    className="font-black text-white text-center"
                    style={{
                      fontSize: 'clamp(28px, 5vw, 52px)',
                      letterSpacing: '-0.025em',
                    }}
                  >
                    {loc.name}
                  </h3>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom padding */}
      <div className="pb-20 sm:pb-24" />
    </section>
  )
}

export default function LandingLocations({ locations, isMultiple }: Props) {
  if (locations.length === 0) return null

  return isMultiple
    ? <MultipleLocations locations={locations} />
    : <SingleLocation loc={locations[0]!} />
}
