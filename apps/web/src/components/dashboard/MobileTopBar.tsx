'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, HelpCircle, User as UserIcon } from 'lucide-react'

interface MobileTopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
}

function computeInitials(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export function MobileTopBar({ fullName, avatarUrl }: MobileTopBarProps) {
  const [imgError, setImgError] = React.useState(false)

  const initials = computeInitials(fullName ?? null)
  const showImage = !!avatarUrl && !imgError

  return (
    <div
      className="mobile-only"
      style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'var(--mobile-topbar-height)',
        zIndex: 50,
        background: 'transparent',
        boxShadow: 'none',
        padding: '0 16px',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Link
        href="/profilo"
        aria-label="Profilo"
        style={{
          width: 48,
          height: 48,
          borderRadius: 100,
          background: '#E9E9E9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          textDecoration: 'none',
          fontSize: 16,
          fontWeight: 600,
          color: '#222222',
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
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 100 }}
          />
        ) : initials ? (
          <span style={{ lineHeight: 1, display: 'block' }}>{initials}</span>
        ) : (
          <UserIcon size={22} color="#222222" />
        )}
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button
          type="button"
          aria-label="Aiuto"
          style={{
            width: 48,
            height: 48,
            borderRadius: 100,
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <HelpCircle size={22} color="#222222" />
        </button>

        <button
          type="button"
          aria-label="Notifiche"
          style={{
            position: 'relative',
            width: 48,
            height: 48,
            borderRadius: 100,
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <Bell size={22} color="#222222" />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 12,
              height: 12,
              borderRadius: 100,
              background: '#DC2626',
              border: '2px solid #FFFFFF',
            }}
          />
        </button>
      </div>
    </div>
  )
}
