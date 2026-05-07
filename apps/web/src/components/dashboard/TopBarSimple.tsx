'use client'

import { Bell } from 'lucide-react'
import { usePathname } from 'next/navigation'

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
  app: 'App',
}

interface TopBarSimpleProps {
  fullName: string
  avatarUrl: string | null
}

export default function TopBarSimple({ fullName, avatarUrl }: TopBarSimpleProps) {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1] ?? ''
  const pageTitle = PAGE_NAMES[lastSegment] ?? 'Dashboard'

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mobile-only topbar-glass">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 14,
          paddingBottom: 16,
        }}
      >
        {/* AVATAR — left */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2.5px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              border: '2.5px solid rgba(255,255,255,0.9)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 15,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '0.5px',
            }}
          >
            {initials}
          </div>
        )}

        {/* PAGE TITLE — absolute center */}
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 17,
            fontWeight: 700,
            color: '#111111',
            letterSpacing: '-0.2px',
            whiteSpace: 'nowrap',
          }}
        >
          {pageTitle}
        </span>

        {/* BELL — right */}
        <button
          type="button"
          aria-label="Notifiche"
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.07)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          <Bell size={20} color="#111111" strokeWidth={1.8} />
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
    </div>
  )
}
