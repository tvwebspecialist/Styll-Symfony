'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatar } from '@/lib/actions/profilo'

const AVATAR_SIZE = 100

interface Props {
  avatarUrl: string | null
  fullName: string
  email?: string | null
}

export function AvatarHero({ avatarUrl: initialAvatarUrl, fullName, email }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [uploading, startUpload] = useTransition()

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 24, paddingBottom: 28 }}>

      {/* Avatar */}
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
          border: '3px solid #f0f0f0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
          cursor: 'pointer',
          padding: 0,
          background: 'none',
          display: 'block',
          flexShrink: 0,
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

      {/* Name */}
      <p style={{ fontSize: 24, fontWeight: 800, color: '#0a0a0a', margin: '18px 0 0', lineHeight: 1.2, textAlign: 'center' }}>
        {fullName}
      </p>

      {/* Email */}
      {email && (
        <p style={{ fontSize: 14, color: '#9ca3af', margin: '6px 0 0', textAlign: 'center', lineHeight: 1.4 }}>
          {email}
        </p>
      )}

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
