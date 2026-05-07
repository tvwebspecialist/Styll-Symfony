'use client'

import { Bell, Search, SlidersHorizontal } from 'lucide-react'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface TopBarHomeProps {
  fullName: string
  avatarUrl: string | null
}

export default function TopBarHome({ fullName, avatarUrl }: TopBarHomeProps) {
  const { greeting, subtitle } = useDashboardHomeStore()

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const displayGreeting = greeting || `Ciao, ${fullName.split(' ')[0]}`
  const displaySubtitle = subtitle || 'Nessun appuntamento oggi'

  return (
    <div className="mobile-only topbar-glass topbar-glass--home">
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 14,
          paddingBottom: 18,
        }}
      >

        {/* ROW 1 — avatar + bell */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={fullName}
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
              }}
            />
          ) : (
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                border: '2.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.5px',
              }}
            >
              {initials}
            </div>
          )}

          <button
            type="button"
            aria-label="Notifiche"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.62)',
              border: '1px solid rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
            }}
          >
            <Bell size={21} color="#111111" strokeWidth={1.8} />
            <span
              style={{
                position: 'absolute',
                top: 9,
                right: 9,
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: '#ef4444',
                border: '1.5px solid rgba(250,251,253,0.9)',
              }}
            />
          </button>
        </div>

        {/* ROW 2 — greeting + subtitle */}
        <div style={{ marginBottom: 16 }}>
          <p
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
            }}
          >
            {displayGreeting}
          </p>
          <p
            style={{
              margin: 0,
              marginTop: 4,
              fontSize: 14,
              fontWeight: 400,
              color: '#666666',
              lineHeight: 1.4,
            }}
          >
            {displaySubtitle}
          </p>
        </div>

        {/* ROW 3 — search bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.66)',
              border: '1px solid rgba(255,255,255,0.78)',
              borderRadius: 50,
              paddingLeft: 16,
              paddingRight: 16,
              height: 44,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7), 0 5px 18px rgba(15,23,42,0.07)',
            }}
          >
            <Search size={17} color="#888888" strokeWidth={2} />
            <input
              type="text"
              placeholder="Cerca clienti, servizi..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontSize: 15,
                color: '#111111',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <button
            type="button"
            aria-label="Filtri"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.62)',
              border: '1px solid rgba(255,255,255,0.7)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
            }}
          >
            <SlidersHorizontal size={18} color="#111111" strokeWidth={1.8} />
          </button>
        </div>

      </div>
    </div>
  )
}
