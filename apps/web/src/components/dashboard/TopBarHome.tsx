'use client'

import * as React from 'react'
import Link from 'next/link'
import { HelpCircle, Search, User as UserIcon } from 'lucide-react'
import { useDashboardHomeStore } from '@/store/dashboard-home-store'

interface TopBarHomeProps {
  fullName?: string | null
  avatarUrl?: string | null
}

function computeInitials(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export function TopBarHome({ fullName, avatarUrl }: TopBarHomeProps) {
  const [imgError, setImgError] = React.useState(false)
  const firstName = fullName ? fullName.split(' ')[0] : null
  const initials = computeInitials(fullName)
  const showImage = !!avatarUrl && !imgError

  const { greeting, subtitle, ready } = useDashboardHomeStore()
  // Fallback while DashboardHomeClient is mounting and populating the store
  const displayGreeting = ready ? greeting : (firstName ? `Ciao ${firstName}` : 'Ciao')
  const displaySubtitle = ready ? subtitle : ''

  return (
    <div
      className="mobile-only topbar-glass"
      style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 12,
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

        {/* Avatar */}
        <Link
          href="/profilo"
          aria-label="Profilo"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#E9E9E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 600,
            color: '#222222',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl as string}
              alt="Avatar"
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : initials ? (
            <span style={{ lineHeight: 1, display: 'block' }}>{initials}</span>
          ) : (
            <UserIcon size={20} color="#222222" />
          )}
        </Link>

        {/* Greeting + Subtitle + Search */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 800,
                color: '#222222',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.2,
                letterSpacing: '-0.7px',
              }}
            >
              {displayGreeting}
            </h1>
            {/* Reserve minimum height to avoid layout shift when subtitle loads */}
            <p
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
                color: '#666666',
                fontFamily: 'Outfit, sans-serif',
                lineHeight: 1.4,
                minHeight: '22px',
              }}
            >
              {displaySubtitle}
            </p>
          </div>

          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search
              size={16}
              color="#9CA3AF"
              style={{ position: 'absolute', left: 12, pointerEvents: 'none' }}
            />
            <input
              type="search"
              placeholder="Cerca clienti, appuntamenti..."
              style={{
                width: '100%',
                height: 40,
                padding: '8px 12px 8px 36px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.4)',
                background: 'rgba(255,255,255,0.5)',
                fontSize: 14,
                fontFamily: 'Outfit, sans-serif',
                color: '#222222',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Help button */}
        <button
          type="button"
          aria-label="Aiuto"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'rgba(255,255,255,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <HelpCircle size={20} color="#222222" />
        </button>

      </div>
    </div>
  )
}
