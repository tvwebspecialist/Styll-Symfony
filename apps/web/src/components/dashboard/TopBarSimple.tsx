'use client'

import * as React from 'react'
import Link from 'next/link'
import { Bell, HelpCircle, User as UserIcon } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface TopBarSimpleProps {
  fullName?: string | null
  avatarUrl?: string | null
}

const PAGE_NAMES: Record<string, string> = {
  calendario: 'Calendario',
  clienti: 'Clienti',
  vendite: 'Vendite',
  catalogo: 'Catalogo',
  team: 'Team',
  marketing: 'Marketing',
  impostazioni: 'Impostazioni',
  profilo: 'Profilo',
  loyalty: 'Loyalty',
  app: 'La mia App',
}

function getPageName(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  const lastSegment = parts[parts.length - 1] ?? ''
  return PAGE_NAMES[lastSegment] ?? 'Dashboard'
}

function computeInitials(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('')
}

export function TopBarSimple({ fullName, avatarUrl }: TopBarSimpleProps) {
  const pathname = usePathname() ?? ''
  const [imgError, setImgError] = React.useState(false)
  const pageName = getPageName(pathname)
  const isSettings = pathname.includes('/impostazioni')
  const initials = computeInitials(fullName)
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
        zIndex: 100,
        background: '#FFFFFF',
        borderBottom: '1px solid #F0F0F0',
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#E9E9E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            color: '#222222',
            flexShrink: 0,
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
            <UserIcon size={18} color="#222222" />
          )}
        </Link>

        {/* Page title */}
        <h1
          style={{
            flex: 1,
            textAlign: 'center',
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: '#222222',
            fontFamily: 'Outfit, sans-serif',
            letterSpacing: '-0.3px',
          }}
        >
          {pageName}
        </h1>

        {/* Right actions: Help (settings only) + Bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {isSettings && (
            <button
              type="button"
              aria-label="Aiuto"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#F5F5F5',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <HelpCircle size={18} color="#555555" />
            </button>
          )}
          <button
            type="button"
            aria-label="Notifiche"
            style={{
              position: 'relative',
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#F5F5F5',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Bell size={18} color="#222222" />
            <span
              style={{
                position: 'absolute',
                top: 7,
                right: 7,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#DC2626',
                border: '1.5px solid #FFFFFF',
              }}
            />
          </button>
        </div>

      </div>
    </div>
  )
}
