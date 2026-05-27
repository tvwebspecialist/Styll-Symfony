'use client'

import { Bell } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getDashboardSection } from '@/lib/dashboard-path'
import { MOCK_UNREAD_COUNT } from '@/components/dashboard/notifiche/NotificheClient'

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
  notifiche: 'Notifiche',
}

interface TopBarSimpleProps {
  fullName: string
  avatarUrl: string | null
}

export default function TopBarSimple({ fullName, avatarUrl }: TopBarSimpleProps) {
  const pathname = usePathname()
  const section = getDashboardSection(pathname)
  const pageTitle = section ? PAGE_NAMES[section] ?? 'Dashboard' : 'Dashboard'

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="mobile-only topbar-glass topbar-glass--simple">
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 10,
          paddingBottom: 12,
        }}
      >
        {/* AVATAR — left */}
        <Link
          href="/profilo"
          aria-label="Profilo"
          style={{ display: 'block', borderRadius: '50%', flexShrink: 0 }}
        >
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
                cursor: 'pointer',
                display: 'block',
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
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.5px',
                cursor: 'pointer',
              }}
            >
              {initials}
            </div>
          )}
        </Link>

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
            maxWidth: 'calc(100% - 136px)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            textAlign: 'center',
          }}
        >
          {pageTitle}
        </span>

        {/* BELL — right */}
        <Link
          href="/notifiche"
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
            flexShrink: 0,
            position: 'relative',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
            textDecoration: 'none',
          }}
        >
          <Bell size={20} color="#111111" strokeWidth={1.8} />
          {MOCK_UNREAD_COUNT > 0 && (
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: '#ef4444',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                border: '2px solid rgba(250,251,253,0.9)',
                lineHeight: 1,
              }}
            >
              {MOCK_UNREAD_COUNT}
            </span>
          )}
        </Link>
      </div>
    </div>
  )
}
