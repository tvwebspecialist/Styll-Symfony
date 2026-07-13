'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

interface TopBarDetailProps {
  title: string
}

export default function TopBarDetail({ title }: TopBarDetailProps) {
  const router = useRouter()
  const pathname = usePathname()

  function handleBack() {
    const parts = pathname.split('/').filter(Boolean)
    router.push('/' + parts.slice(0, -1).join('/'))
  }

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
        {/* BACK — left */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Torna indietro"
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
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65), 0 4px 14px rgba(15,23,42,0.08)',
            padding: 0,
          }}
        >
          <ChevronLeft size={22} color="#111111" strokeWidth={2} />
        </button>

        {/* TITLE — absolute center */}
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

        {/* RIGHT SPACER — keeps title centered */}
        <div style={{ width: 44, height: 44, flexShrink: 0 }} aria-hidden />
      </div>
    </div>
  )
}
