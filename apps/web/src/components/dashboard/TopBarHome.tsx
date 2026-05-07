'use client'

import * as React from 'react'
import { Bell, Search, SlidersHorizontal } from 'lucide-react'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface TopBarHomeProps {
  fullName?: string | null
  avatarUrl?: string | null
}

export function TopBarHome({ fullName, avatarUrl }: TopBarHomeProps) {
  const [imgError, setImgError] = React.useState(false)
  const firstLetter = fullName ? fullName.trim()[0]?.toUpperCase() ?? '' : ''
  const showImage = !!avatarUrl && !imgError

  const { greeting, subtitle, ready } = useDashboardHomeStore()
  const displayGreeting = ready ? greeting : (fullName ? `Ciao ${fullName.split(' ')[0]}` : 'Ciao')
  const displaySubtitle = ready ? subtitle : ''

  return (
    <div
      className="mobile-only topbar-glass"
      style={{ display: 'none', paddingLeft: 20, paddingRight: 20, paddingBottom: 16 }}
    >
      {/* ROW 1: avatar left, bell right */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 14,
          paddingTop: 12,
        }}
      >
        {/* Avatar */}
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl as string}
            alt="Avatar"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.8)',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: '#e5e5e5',
              color: '#555',
              fontSize: 16,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid rgba(255,255,255,0.8)',
              flexShrink: 0,
            }}
          >
            {firstLetter}
          </div>
        )}

        {/* Bell button */}
        <button
          type="button"
          aria-label="Notifiche"
          style={{
            position: 'relative',
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Bell size={18} color="#1a1a1a" />
          {/* Badge — always visible (not yet wired to real data) */}
          <span
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
            }}
          />
        </button>
      </div>

      {/* ROW 2: greeting + subtitle */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
          {displayGreeting}
        </p>
        <p style={{ margin: 0, marginTop: 3, fontSize: 13, fontWeight: 400, color: '#6b6b6b' }}>
          {displaySubtitle}
        </p>
      </div>

      {/* ROW 3: search + filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Search container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(0,0,0,0.06)',
            borderRadius: 50,
            paddingLeft: 14,
            paddingRight: 14,
            height: 40,
            border: 'none',
          }}
        >
          <Search size={16} color="#9a9a9a" style={{ flexShrink: 0 }} />
          <input
            type="search"
            placeholder="Cerca servizi, clienti..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#1a1a1a',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Filter button */}
        <button
          type="button"
          aria-label="Filtri"
          style={{
            background: 'rgba(0,0,0,0.06)',
            border: 'none',
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <SlidersHorizontal size={17} color="#1a1a1a" />
        </button>
      </div>
    </div>
  )
}
