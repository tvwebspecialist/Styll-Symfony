import Link from 'next/link'
import type { ReactNode } from 'react'

interface AuthSplitLayoutProps {
  mobileTopRight?: ReactNode
  /** Used as the narrative headline in the dark left panel */
  caption?: string
  /** @deprecated — dark panel now has built-in app preview. Kept for type compatibility. */
  illustration?: ReactNode
  children: ReactNode
}

/** Mini PWA preview for the dark panel */
function AppPreview() {
  return (
    <div style={{
      width: '100%',
      maxWidth: 280,
      margin: '0 auto',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      padding: 20,
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mercoledì</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#ffffff' }}>Ciao, Marco 👋</div>
        </div>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #E94560, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          color: '#fff',
        }}>
          M
        </div>
      </div>

      {/* Stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 16 }}>
        {[
          { label: 'Oggi', value: '8', sub: 'appt.' },
          { label: 'Revenue', value: '€340', sub: 'sett.' },
          { label: 'Fedeli', value: '89%', sub: 'ret.' },
        ].map((k) => (
          <div key={k.label} style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '10px 8px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 3 }}>{k.label}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Next appointment */}
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '12px 14px' }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          PROSSIMO
        </div>
        {[
          { time: '10:00', name: 'Luigi R.', service: 'Taglio + Barba', color: '#E94560' },
          { time: '11:30', name: 'Federico M.', service: 'Taglio', color: '#7C3AED' },
        ].map((a) => (
          <div key={a.time} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', width: 32, flexShrink: 0 }}>{a.time}</div>
            <div style={{
              flex: 1,
              background: `${a.color}18`,
              border: `1px solid ${a.color}40`,
              borderRadius: 6,
              padding: '5px 8px',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#ffffff' }}>{a.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{a.service}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Loyalty bar */}
      <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>🔥 Streak 7 visite</span>
          <span style={{ fontSize: 10, color: '#E94560', fontWeight: 700 }}>Silver</span>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: '68%', background: 'linear-gradient(90deg, #E94560, #7C3AED)', borderRadius: 99 }} />
        </div>
      </div>
    </div>
  )
}

export function AuthSplitLayout({
  mobileTopRight,
  caption,
  children,
}: AuthSplitLayoutProps) {
  return (
    <div
      className="flex flex-col lg:flex-row"
      style={{ minHeight: '100dvh', backgroundColor: 'var(--color-bg)' }}
    >
      {/* ── Dark narrative panel — LEFT on desktop, hidden on mobile ── */}
      <aside
        className="relative hidden overflow-hidden lg:flex lg:w-[44%] flex-col"
        style={{
          background: 'linear-gradient(160deg, #0d0d1a 0%, #111126 60%, #0f0f20 100%)',
        }}
      >
        {/* Decorative radial glows */}
        <div style={{
          position: 'absolute', top: -120, right: -80, width: 440, height: 440, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(233,69,96,0.14) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -60, left: -60, width: 340, height: 340, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'relative',
          zIndex: 1,
          padding: '44px 52px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Styll wordmark */}
          <Link
            href="/"
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textDecoration: 'none',
            }}
          >
            Styll
          </Link>

          {/* Center content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 32 }}>
            <AppPreview />

            {caption && (
              <p style={{
                fontSize: 'clamp(17px, 1.6vw, 21px)',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.45,
                letterSpacing: '-0.01em',
                textAlign: 'center',
                maxWidth: 280,
                margin: '0 auto',
              }}>
                {caption}
              </p>
            )}
          </div>

          {/* Bottom social proof */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex' }}>
                {['M', 'A', 'S', 'F'].map((initial, i) => (
                  <div key={i} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: ['#7C3AED', '#059669', '#D97706', '#2563EB'][i],
                    border: '2px solid rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#ffffff',
                    marginLeft: i > 0 ? -6 : 0,
                    position: 'relative', zIndex: 4 - i,
                  }}>
                    {initial}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                <strong style={{ color: 'rgba(255,255,255,0.7)' }}>+137</strong> barbieri attivi
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Mobile header ── */}
      <div
        className="flex items-center justify-between px-5 lg:hidden"
        style={{
          paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
          paddingBottom: 16,
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Link
          href="/"
          className="text-xl font-bold tracking-tight"
          style={{ color: 'var(--color-fg)', letterSpacing: '-0.02em' }}
        >
          Styll
        </Link>
        {mobileTopRight && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: 100,
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            {mobileTopRight}
          </div>
        )}
      </div>

      {/* ── Form panel — RIGHT on desktop, full on mobile ── */}
      <main
        className="flex flex-1 flex-col lg:w-[56%] lg:items-center lg:justify-center lg:px-12"
        style={{ overflowY: 'auto' }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: 440,
            padding: '32px 24px',
            paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))',
          }}
        >
          {children}
        </div>
      </main>
    </div>
  )
}
