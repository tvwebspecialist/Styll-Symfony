'use client'

import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TopBarPWASimpleProps {
  title: string
  rightIcon?: ReactNode
  showBack?: boolean
}

export function TopBarPWASimple({ title, rightIcon, showBack = true }: TopBarPWASimpleProps) {
  const router = useRouter()

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
        {/* LEFT: back button or spacer */}
        {showBack ? (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Torna indietro"
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
            <ChevronLeft size={22} color="#111111" strokeWidth={2} />
          </button>
        ) : (
          <div style={{ width: 40, height: 40, flexShrink: 0 }} />
        )}

        {/* CENTER: title — absolute for true centering */}
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
          {title}
        </span>

        {/* RIGHT: optional icon or spacer */}
        <div
          style={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {rightIcon}
        </div>
      </div>
    </div>
  )
}
