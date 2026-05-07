'use client'

import * as React from 'react'
import Link from 'next/link'
import { HelpCircle, Search, User as UserIcon } from 'lucide-react'

interface TopBarHomeProps {
  fullName?: string | null
  avatarUrl?: string | null
}

function computeInitials(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Buongiorno'
  if (h < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

export function TopBarHome({ fullName, avatarUrl }: TopBarHomeProps) {
  const [imgError, setImgError] = React.useState(false)
  const firstName = fullName ? fullName.split(' ')[0] : null
  const initials = computeInitials(fullName)
  const showImage = !!avatarUrl && !imgError

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

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

        {/* Greeting + Search */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 500,
              color: '#222222',
              fontFamily: 'Outfit, sans-serif',
              lineHeight: 1.3,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </p>
          <div
            style={{
              marginTop: 6,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              color="#9CA3AF"
              style={{ position: 'absolute', left: 10, pointerEvents: 'none' }}
            />
            <input
              type="search"
              placeholder="Cerca clienti, appuntamenti..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 30px',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 13,
                fontFamily: 'Outfit, sans-serif',
                background: 'rgba(255,255,255,0.6)',
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
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.8)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <HelpCircle size={20} color="#555555" />
        </button>

      </div>
    </div>
  )
}
