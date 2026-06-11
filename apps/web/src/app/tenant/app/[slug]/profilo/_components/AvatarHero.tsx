'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { uploadAvatar } from '@/lib/actions/profilo'

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

const TIER_STYLES: Record<Tier, { bg: string; color: string }> = {
  Bronze: { bg: '#fef3c7', color: '#b45309' },
  Silver: { bg: '#e5e7eb', color: '#4b5563' },
  Gold:   { bg: '#fef9c3', color: '#a16207' },
  Platinum: { bg: '#f1f5f9', color: '#475569' },
}

const fmt = new Intl.NumberFormat('it-IT')

const AVATAR_SIZE = 100

interface Props {
  userId: string
  avatarUrl: string | null
  fullName: string
  email?: string | null
  tierLabel: Tier
  upcoming: number
  completed: number
  cancelled: number
  availablePoints: number
  nextTierLabel: Tier | null
  pointsToNextTier: number | null
  progress: number
  puntiPath: string
  primaryColor: string
}

export function AvatarHero({
  avatarUrl: initialAvatarUrl,
  fullName,
  email,
  tierLabel,
  upcoming,
  completed,
  cancelled,
  availablePoints,
  nextTierLabel,
  pointsToNextTier,
  progress,
  puntiPath,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, startUpload] = useTransition()
  const barRef = useRef<HTMLDivElement>(null)

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')

  const tierStyle = TIER_STYLES[tierLabel] ?? TIER_STYLES.Bronze

  useEffect(() => {
    const bar = barRef.current
    if (!bar) return
    bar.style.width = '0%'
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (barRef.current) barRef.current.style.width = `${progress}%`
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [progress])

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
    { value: upcoming,  label: 'Futuri' },
    { value: completed, label: 'Completati' },
    { value: cancelled, label: 'Cancellati' },
  ]

  return (
    <div style={{ position: 'relative', paddingTop: 50, marginBottom: 16 }}>

      {/* Avatar flottante sopra la card */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2,
      }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Cambia foto profilo"
          style={{
            position: 'relative',
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            borderRadius: '50%',
            border: '4px solid #ffffff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            cursor: 'pointer',
            padding: 0,
            background: 'none',
            display: 'block',
          }}
        >
          <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'var(--brand-primary)',
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
                backgroundColor: 'rgba(0,0,0,0.30)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}>
                <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              </div>
            )}
          </div>

          {/* Camera badge */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              zIndex: 3,
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
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

      {/* Card bianca — tutti e 4 gli angoli arrotondati */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
        padding: '60px 16px 16px',
      }}>

        {/* Riga: nome sx + badge tier dx */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#0a0a0a', margin: 0, lineHeight: 1.3 }}>
            {fullName}
          </p>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 999,
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: tierStyle.bg,
            color: tierStyle.color,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            marginLeft: 8,
          }}>
            {tierLabel} Member
          </span>
        </div>

        {email && (
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 0 0' }}>{email}</p>
        )}

        <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '12px 0' }} />

        {/* Stats: 3 blocchi #f8f8f8 con gap */}
        <div style={{ display: 'flex', gap: 8 }}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '12px 0',
                backgroundColor: '#f8f8f8',
                borderRadius: 12,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 900, color: '#0a0a0a', lineHeight: 1 }}>
                {fmt.format(stat.value)}
              </span>
              <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, marginTop: 4 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>

        <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '12px 0' }} />

        {/* Gamification recap scuro */}
        <Link
          href={puntiPath}
          className="block active:scale-[0.98] transition-transform"
          style={{ backgroundColor: '#1a1a1a', borderRadius: 12, padding: 12, textDecoration: 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ color: '#ffffff', fontSize: 13, fontWeight: 700 }}>
              {fmt.format(availablePoints)} punti · {tierLabel}
            </span>
            {nextTierLabel && pointsToNextTier !== null ? (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                → {nextTierLabel} a {fmt.format(pointsToNextTier)} pt
              </span>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Livello max</span>
            )}
          </div>
          <div style={{ height: 4, width: '100%', overflow: 'hidden', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <div
              ref={barRef}
              style={{ height: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.8)', width: `${progress}%`, transition: 'width 1s ease-out' }}
            />
          </div>
        </Link>

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
