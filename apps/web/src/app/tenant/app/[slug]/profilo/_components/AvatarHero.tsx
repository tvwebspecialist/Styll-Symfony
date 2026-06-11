'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatar } from '@/lib/actions/profilo'

interface Props {
  userId: string
  avatarUrl: string | null
  fullName: string
  size?: number
}

export function AvatarHero({ avatarUrl: initialAvatarUrl, fullName, size = 110 }: Props) {
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
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          position: 'relative',
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          display: 'block',
          flexShrink: 0,
        }}
        aria-label="Cambia foto profilo"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '4px solid #ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: size,
              height: size,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--brand-primary)',
              border: '4px solid #ffffff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              color: '#ffffff',
              fontSize: Math.round(size * 0.27),
              fontWeight: 700,
            }}
          >
            {initials}
          </div>
        )}

        {uploading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              backgroundColor: 'rgba(0,0,0,0.30)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
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

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </>
  )
}
