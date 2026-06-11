'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatar } from '@/lib/actions/profilo'

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

const TIER_STYLES: Record<Tier, { bg: string; color: string }> = {
  Bronze: { bg: '#fef3c7', color: '#b45309' },
  Silver: { bg: '#e5e7eb', color: '#4b5563' },
  Gold: { bg: '#fef9c3', color: '#a16207' },
  Platinum: { bg: '#f1f5f9', color: '#475569' },
}

const fmt = new Intl.NumberFormat('it-IT')

interface Props {
  userId: string
  avatarUrl: string | null
  fullName: string
  tierLabel: Tier
  upcomingCount: number
  completedCount: number
  cancelledCount: number
}

export function AvatarHero({
  avatarUrl: initialAvatarUrl,
  fullName,
  tierLabel,
  upcomingCount,
  completedCount,
  cancelledCount,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, startUpload] = useTransition()

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')

  const tierStyle = TIER_STYLES[tierLabel] ?? TIER_STYLES.Bronze

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startUpload(async () => {
      const result = await uploadAvatar(fd)
      if (result.ok) setAvatarUrl(result.url)
    })
  }

  const stats = [
    { value: upcomingCount, label: 'Futuri' },
    { value: completedCount, label: 'Completati' },
    { value: cancelledCount, label: 'Cancellati' },
  ]

  return (
    <div style={{ overflow: 'hidden', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>
      {/* Grey photo zone */}
      <div style={{
        backgroundColor: '#F0F0F0',
        height: 140,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}>
        {/* Avatar straddling grey/white boundary */}
        <div style={{ position: 'relative', marginBottom: -50, zIndex: 1 }}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            style={{
              position: 'relative',
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'block',
            }}
            aria-label="Cambia foto profilo"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName}
                style={{
                  width: 100,
                  height: 100,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #ffffff',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  display: 'block',
                }}
              />
            ) : (
              <div style={{
                width: 100,
                height: 100,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--brand-primary)',
                border: '4px solid #ffffff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                color: '#ffffff',
                fontSize: 28,
                fontWeight: 700,
              }}>
                {initials}
              </div>
            )}

            {uploading && (
              <div style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}

            {/* Camera badge */}
            <div
              style={{
                position: 'absolute',
                bottom: 2,
                right: 2,
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-hidden="true"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* White info card */}
      <div style={{
        backgroundColor: '#ffffff',
        paddingTop: 60,
        paddingBottom: 4,
        paddingLeft: 20,
        paddingRight: 20,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#0a0a0a', margin: '0 0 8px 0', lineHeight: 1.2 }}>
          {fullName}
        </p>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: 999,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: tierStyle.bg,
          color: tierStyle.color,
        }}>
          {tierLabel} Member
        </span>

        {/* Stats row */}
        <div style={{ display: 'flex', borderTop: '1px solid #f3f4f6', marginTop: 16 }}>
          {stats.map((stat, i, arr) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '14px 0',
                borderRight: i < arr.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 900, color: '#0a0a0a', lineHeight: 1 }}>
                {fmt.format(stat.value)}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 4 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
