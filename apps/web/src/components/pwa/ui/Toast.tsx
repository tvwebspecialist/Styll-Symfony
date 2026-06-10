'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export type ToastType = 'success' | 'warning' | 'info' | 'error'

interface ToastProps {
  type: ToastType
  message: string
  visible: boolean
  onClose: () => void
  duration?: number
}

const CONFIG: Record<ToastType, { bg: string; border: string; icon: string; color: string }> = {
  success: { bg: 'rgba(220,252,231,0.95)', border: '#16a34a', icon: '✓', color: '#15803d' },
  warning: { bg: 'rgba(254,243,199,0.95)', border: '#d97706', icon: '⚠', color: '#b45309' },
  info:    { bg: 'rgba(219,234,254,0.95)', border: '#2563eb', icon: 'ℹ', color: '#1d4ed8' },
  error:   { bg: 'rgba(254,226,226,0.95)', border: '#dc2626', icon: '✕', color: '#b91c1c' },
}

export function Toast({ type, message, visible, onClose, duration = 3000 }: ToastProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (visible) {
      setMounted(true)
      const t = setTimeout(onClose, duration)
      return () => clearTimeout(t)
    } else {
      const t = setTimeout(() => setMounted(false), 320)
      return () => clearTimeout(t)
    }
  }, [visible, duration, onClose])

  if (!mounted && !visible) return null

  const c = CONFIG[type]

  return (
    <>
      <style>{`
        @keyframes toast-slide-in {
          from { transform: translateX(-50%) translateY(-16px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);     opacity: 1; }
        }
        @keyframes toast-slide-out {
          from { transform: translateX(-50%) translateY(0);     opacity: 1; }
          to   { transform: translateX(-50%) translateY(-16px); opacity: 0; }
        }
      `}</style>
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 'calc(16px + env(safe-area-inset-top, 0px))',
          left: '50%',
          zIndex: 300,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 14px 11px 14px',
          borderRadius: 12,
          background: c.bg,
          border: `1.5px solid ${c.border}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          animation: `${visible ? 'toast-slide-in' : 'toast-slide-out'} 0.28s ease forwards`,
          minWidth: 200,
          maxWidth: 'calc(100vw - 48px)',
          pointerEvents: 'auto',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: 15, color: c.color, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
          {c.icon}
        </span>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#111827', lineHeight: 1.4, whiteSpace: 'normal' }}>
          {message}
        </span>
        <button
          onClick={onClose}
          aria-label="Chiudi"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 2,
            marginLeft: 4,
            color: c.color,
            opacity: 0.55,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <X size={13} />
        </button>
      </div>
    </>
  )
}
