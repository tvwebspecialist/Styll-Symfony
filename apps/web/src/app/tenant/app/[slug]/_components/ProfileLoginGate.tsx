'use client'

import { EmailOtpForm } from '@/components/pwa/auth/EmailOtpForm'

interface ProfileLoginGateProps {
  slug: string
  tenantId: string
  primaryColor?: string | null
  logoUrl?: string | null
  businessName?: string | null
}

function heroBg(color: string): string {
  try {
    let hex = color.replace('#', '')
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `linear-gradient(to bottom, rgba(${r},${g},${b},0.18), transparent)`
  } catch {
    return 'linear-gradient(to bottom, rgba(0,0,0,0.10), transparent)'
  }
}

function getInitials(name: string | null | undefined, slug: string): string {
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => (w[0] ?? '').toUpperCase())
      .join('')
  }
  return slug
    .split('-')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')
}

export function ProfileLoginGate({
  slug,
  tenantId,
  primaryColor,
  logoUrl,
  businessName,
}: ProfileLoginGateProps) {
  const color = primaryColor ?? '#1a1a1a'
  const initials = getInitials(businessName, slug)

  return (
    <div className="min-h-[calc(100dvh-56px)] bg-white flex flex-col">
      {/* Hero gradient */}
      <div
        style={{
          height: 120,
          background: heroBg(color),
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingBottom: 16,
        }}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              objectFit: 'cover',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              backgroundColor: color,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 700,
              fontSize: 26,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Form area */}
      <div className="flex flex-1 flex-col items-center px-5 pt-6 pb-10">
        <div className="mb-6 text-center">
          <h1 className="text-[24px] font-extrabold text-gray-900 leading-tight">Bentornato.</h1>
          <p className="mx-auto mt-1.5 max-w-[260px] text-[14px] text-gray-400 leading-relaxed">
            Accedi per vedere i tuoi appuntamenti, punti e molto altro.
          </p>
        </div>

        <div className="w-full max-w-[440px]">
          <EmailOtpForm
            tenantId={tenantId}
            tenantSlug={slug}
            mode="modal"
          />
        </div>
      </div>
    </div>
  )
}
