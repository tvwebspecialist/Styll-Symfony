'use client'

import { useRef, useState, useTransition } from 'react'
import { uploadAvatar } from '@/lib/actions/profilo'

type Tier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

const TIER_STYLES: Record<Tier, { bg: string; text: string }> = {
  Bronze: { bg: 'bg-amber-100', text: 'text-amber-700' },
  Silver: { bg: 'bg-neutral-200', text: 'text-neutral-600' },
  Gold: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  Platinum: { bg: 'bg-slate-100', text: 'text-slate-600' },
}

interface Props {
  userId: string
  avatarUrl: string | null
  fullName: string
  tierLabel: Tier
}

export function AvatarHero({ avatarUrl: initialAvatarUrl, fullName, tierLabel }: Props) {
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

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative mb-3 rounded-full active:scale-95 transition-transform"
        aria-label="Cambia foto profilo"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={fullName}
            className="size-20 rounded-full object-cover"
            style={{ border: '3px solid var(--brand-primary)' }}
          />
        ) : (
          <div
            className="size-20 rounded-full flex items-center justify-center text-white text-xl font-bold"
            style={{
              backgroundColor: 'var(--brand-primary)',
              border: '3px solid var(--brand-primary)',
            }}
          >
            {initials}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
            <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        )}
        <div
          className="absolute bottom-0 right-0 size-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm"
          aria-hidden="true"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
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

      <p className="text-[18px] font-bold text-neutral-950 leading-tight">{fullName}</p>
      <span className={`mt-1.5 inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${tierStyle.bg} ${tierStyle.text}`}>
        {tierLabel} Member
      </span>
    </div>
  )
}
