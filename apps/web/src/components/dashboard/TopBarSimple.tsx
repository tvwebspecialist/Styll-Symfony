'use client'

import * as React from 'react'
import { Bell } from 'lucide-react'
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

export function TopBarSimple({ fullName, avatarUrl }: TopBarSimpleProps) {
  const pathname = usePathname() ?? ''
  const [imgError, setImgError] = React.useState(false)
  const pageName = getPageName(pathname)
  const firstLetter = fullName ? fullName.trim()[0]?.toUpperCase() ?? '' : ''
  const showImage = !!avatarUrl && !imgError

  // TODO: help button for /impostazioni
  // const isSettings = pathname.includes('/impostazioni')

  return (
    <div className="mobile-only topbar-glass" style={{ display: 'none' }}>
      {/* Inner row — padding and flex layout live here, NOT on the glass shell */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 12,
          paddingBottom: 14,
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.8)',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: 36,
            height: 36,
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

      {/* Page title — absolutely centred so it stays visually centred regardless of side element widths */}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 17,
          fontWeight: 600,
          color: '#1a1a1a',
          whiteSpace: 'nowrap',
        }}
      >
        {pageName}
      </span>

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
          flexShrink: 0,
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
  </div>
  )
}
