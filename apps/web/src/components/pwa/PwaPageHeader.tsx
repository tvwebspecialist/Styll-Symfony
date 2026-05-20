'use client'

import type { ReactNode } from 'react'
import React from 'react'
import { Bell } from 'lucide-react'

type PwaPageHeaderVariant = 'home' | 'page' | 'page-with-actions'

interface PwaPageHeaderProps {
  variant: PwaPageHeaderVariant

  // variant: 'home'
  clientName?: string | null
  clientAvatarUrl?: string | null
  onNotificationsPress?: () => void
  hasUnreadNotifications?: boolean

  // variant: 'page' | 'page-with-actions'
  title?: string

  // variant: 'page-with-actions'
  leftAction?: {
    icon: ReactNode
    onPress: () => void
    ariaLabel: string
  }
  rightAction?: {
    icon: ReactNode
    onPress: () => void
    ariaLabel: string
  }

  // shared
  fontFamily?: string | null
}

function getItalianGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return 'Buongiorno 👋'
  if (h >= 12 && h < 18) return 'Buon pomeriggio 👋'
  if (h >= 18 && h < 22) return 'Buonasera 👋'
  return 'Bentornato 👋'
}

const iconButtonStyle: React.CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: '50%',
  background: '#FFFFFF',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 2px 12px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
}

function ActionButton({
  action,
}: {
  action: NonNullable<PwaPageHeaderProps['leftAction']>
}) {
  return (
    <button
      type="button"
      onClick={action.onPress}
      aria-label={action.ariaLabel}
      style={iconButtonStyle}
    >
      {action.icon}
    </button>
  )
}

export function PwaPageHeader({
  variant,
  clientName,
  clientAvatarUrl,
  onNotificationsPress,
  hasUnreadNotifications,
  title,
  leftAction,
  rightAction,
  fontFamily,
}: PwaPageHeaderProps) {
  // ── VARIANT: home ───────────────────────────────────────────────────────────
  if (variant === 'home') {
    const displayName = clientName?.split(' ')[0] ?? 'Ospite'
    const initial = displayName.charAt(0).toUpperCase()

    return (
      <div
        style={{
          padding: '16px 20px 12px 20px',
          background: 'transparent',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Avatar */}
        <div style={{ flexShrink: 0 }}>
          {clientAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clientAvatarUrl}
              alt={displayName}
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                objectFit: 'cover',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: '#E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 700,
                color: '#6B7280',
              }}
            >
              {initial}
            </div>
          )}
        </div>

        {/* Greeting text */}
        <div style={{ flex: 1, paddingLeft: 14, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#9CA3AF' }}>
            {getItalianGreeting()}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 800,
              color: '#111111',
              fontFamily: fontFamily ?? 'inherit',
              lineHeight: 1.1,
            }}
          >
            {displayName}
          </p>
        </div>

        {/* Notifications button */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onNotificationsPress}
            aria-label="Notifiche"
            style={{ ...iconButtonStyle, overflow: 'visible' }}
          >
            <Bell size={20} color="#111111" strokeWidth={1.8} />
          </button>
          {hasUnreadNotifications && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: page ────────────────────────────────────────────────────────────
  if (variant === 'page') {
    return (
      <div
        style={{
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'transparent',
          boxSizing: 'border-box',
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 24,
            fontWeight: 700,
            color: '#111111',
            fontFamily: fontFamily ?? 'inherit',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: 'calc(100% - 40px)',
          }}
        >
          {title}
        </span>
      </div>
    )
  }

  // ── VARIANT: page-with-actions ───────────────────────────────────────────────
  return (
    <div
      style={{
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 20,
          paddingRight: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          background: 'transparent',
          boxSizing: 'border-box',
        }}
    >
      {leftAction ? <ActionButton action={leftAction} /> : <div style={{ width: 52, height: 52 }} />}

      <span
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 24,
          fontWeight: 700,
          color: '#111111',
          fontFamily: fontFamily ?? 'inherit',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 'calc(100% - 40px)',
        }}
      >
        {title}
      </span>

      {rightAction ? <ActionButton action={rightAction} /> : <div style={{ width: 52, height: 52 }} />}
    </div>
  )
}
