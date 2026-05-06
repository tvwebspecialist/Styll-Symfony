'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search, HelpCircle, Moon, Bell, User as UserIcon } from 'lucide-react'

interface TopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
  initials?: string
  impersonation?: {
    adminName: string
    tenantName: string
  } | null
}

function computeInitials(fullName: string | null | undefined, fallback?: string): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || (fallback ?? '')
  }
  return (fallback ?? '').slice(0, 2).toUpperCase()
}

export function TopBar({ fullName, avatarUrl, initials, impersonation }: TopBarProps) {
  const [imgError, setImgError] = React.useState(false)

  const initialsText = computeInitials(fullName ?? null, initials)
  const showImage = !!avatarUrl && !imgError
  const showInitials = !showImage && initialsText.length > 0

  return (
    <div
      className="desktop-topbar"
      style={{
        display: 'flex',
        padding: '16px 16px 0 16px',
        gap: 10,
        alignItems: 'center',
        width: '100%',
        height: 'var(--topbar-height)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 173,
          padding: 12,
          borderRadius: 20,
          background: '#FFFFFF',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: impersonation ? 14 : 32,
            color: '#222222',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {impersonation ? (
            <>
              <span style={{ color: '#222' }}>{impersonation.adminName}</span>
              <span
                style={{
                  background: '#E94560',
                  color: '#fff',
                  borderRadius: 6,
                  padding: '2px 6px',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                }}
              >
                ADMIN
              </span>
              <span style={{ color: '#999', fontWeight: 500 }}>→</span>
              <span style={{ color: '#8B5CF6' }}>{impersonation.tenantName}</span>
            </>
          ) : (
            'Styll'
          )}
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            padding: '5px 5px 5px 25px',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: 100,
            border: '1px solid #E9E9E9',
            background: '#F4F4F4',
            boxShadow: '0 6px 15px 0 rgba(64, 79, 104, 0.05)',
          }}
        >
          <span style={{ color: '#B0B0B0', fontSize: 14 }}>Cosa stai cercando..</span>
          <button
            type="button"
            style={{
              width: 40,
              height: 40,
              borderRadius: 100,
              background: '#FFFFFF',

              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Cerca"
          >
            <Search size={18} color="#222222" />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            marginLeft: 'auto',
          }}
        >
          <button
            type="button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 16px',
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              cursor: 'pointer',
            }}
          >
            <HelpCircle size={16} color="#222222" />
            <span style={{ fontSize: 13, color: '#222222' }}>Hai bisogno di aiuto?</span>
          </button>

          <button
            type="button"
            aria-label="Tema scuro"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Moon size={18} color="#222222" />
          </button>

          <button
            type="button"
            aria-label="Notifiche"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              border: '1px solid #E9E9E9',
              background: '#FFFFFF',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={18} color="#222222" />
          </button>

          <Link
            href="/profilo"
            aria-label="Profilo"
            style={{
              width: 50,
              height: 50,
              borderRadius: 100,
              background: '#E9E9E9',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: '#222222',
              cursor: 'pointer',
              padding: 0,
              transition: 'opacity 120ms ease',
              overflow: 'hidden',
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
          >
            {showImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl as string}
                alt="Avatar"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 100,
                }}
              />
            ) : showInitials ? (
              <span>{initialsText}</span>
            ) : (
              <UserIcon size={20} color="#222222" />
            )}
          </Link>
        </div>
      </div>
    </div>
  )
}
