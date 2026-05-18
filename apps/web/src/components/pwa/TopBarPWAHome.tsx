'use client'

import { Bell } from 'lucide-react'

interface TopBarPWAHomeProps {
  tenantName: string
  tenantLogoUrl?: string | null
  clientName?: string | null
}

export function TopBarPWAHome({ tenantName, tenantLogoUrl, clientName }: TopBarPWAHomeProps) {
  const initials = tenantName.slice(0, 2).toUpperCase()
  const greeting = clientName ? `Ciao, ${clientName.split(' ')[0]} 👋` : 'Bentornato 👋'

  return (
    <div className="topbar-glass topbar-glass--simple">
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
        {/* LEFT: tenant logo */}
        <div style={{ flexShrink: 0 }}>
          {tenantLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tenantLogoUrl}
              alt={tenantName}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'var(--brand-primary, #1a1a2e)',
                border: '2.5px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.5px',
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* CENTER: greeting — absolute for true centering */}
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
          {greeting}
        </span>

        {/* RIGHT: bell button (placeholder — non funzionale) */}
        <button
          type="button"
          aria-label="Notifiche"
          style={{
            width: 40,
            height: 40,
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
          <Bell size={20} color="#111111" strokeWidth={1.8} />
        </button>
      </div>
    </div>
  )
}
