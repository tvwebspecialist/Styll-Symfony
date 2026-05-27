'use client'

import * as React from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { PwaShell } from '@/components/pwa/PwaShell'
import { PwaSplash } from '@/components/pwa/PwaSplash'
import { readPwaPreviewConfig } from '@/lib/pwa-preview'

const FONT_MAP: Record<string, string> = {
  outfit: 'var(--font-outfit)',
  poppins: 'var(--font-poppins)',
  inter: 'var(--font-inter)',
  playfair: '"Playfair Display", serif',
  montserrat: '"Montserrat", sans-serif',
}

const GOOGLE_FONT_URLS: Record<string, string> = {
  playfair: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&display=swap',
  montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
}

interface Props {
  slug: string
  businessName: string
  logoUrl: string | null
  primaryColor: string | null
  secondaryColor: string | null
  fontFamily: string | null
  clientName: string | null
  clientAvatarUrl: string | null
  children: ReactNode
}

function ensureGoogleFont(fontKey: string | null) {
  if (!fontKey) return

  const fontUrl = GOOGLE_FONT_URLS[fontKey]
  if (!fontUrl) return

  const linkId = `pwa-font-${fontKey}`
  if (document.getElementById(linkId)) return

  const preconnectGoogle = 'pwa-font-preconnect-google'
  if (!document.getElementById(preconnectGoogle)) {
    const link = document.createElement('link')
    link.id = preconnectGoogle
    link.rel = 'preconnect'
    link.href = 'https://fonts.googleapis.com'
    document.head.appendChild(link)
  }

  const preconnectStatic = 'pwa-font-preconnect-static'
  if (!document.getElementById(preconnectStatic)) {
    const link = document.createElement('link')
    link.id = preconnectStatic
    link.rel = 'preconnect'
    link.href = 'https://fonts.gstatic.com'
    link.crossOrigin = 'anonymous'
    document.head.appendChild(link)
  }

  const stylesheet = document.createElement('link')
  stylesheet.id = linkId
  stylesheet.rel = 'stylesheet'
  stylesheet.href = fontUrl
  document.head.appendChild(stylesheet)
}

export function PwaPreviewShell({
  slug,
  businessName,
  logoUrl,
  primaryColor,
  secondaryColor,
  fontFamily,
  clientName,
  clientAvatarUrl,
  children,
}: Props) {
  const searchParams = useSearchParams()
  const preview = readPwaPreviewConfig(searchParams)

  const activeBusinessName = preview.businessName ?? businessName
  const activeLogoUrl = preview.logoUrl ?? logoUrl
  const activePrimaryColor = preview.primaryColor ?? primaryColor ?? '#1A1A1A'
  const activeSecondaryColor = secondaryColor ?? '#666666'
  const activeFontKey = (preview.fontFamily ?? fontFamily ?? 'outfit').toLowerCase()
  const activeFontFamily = FONT_MAP[activeFontKey] ?? FONT_MAP.outfit

  React.useEffect(() => {
    ensureGoogleFont(activeFontKey)
  }, [activeFontKey])

  const brandVars = React.useMemo(
    () =>
      ({
        '--brand-primary': activePrimaryColor,
        '--brand-secondary': activeSecondaryColor,
        '--color-primary': activePrimaryColor,
        '--font-active': activeFontFamily,
      }) as CSSProperties,
    [activeFontFamily, activePrimaryColor, activeSecondaryColor],
  )

  return (
    <div
      style={{ ...brandVars, background: '#F7F7F7', minHeight: '100dvh' }}
      className="text-foreground [font-family:var(--font-active)]"
    >
      {!preview.enabled && (
        <PwaSplash
          businessName={activeBusinessName}
          primaryColor={activePrimaryColor}
          logoUrl={activeLogoUrl}
        />
      )}

      <PwaShell
        slug={slug}
        businessName={activeBusinessName}
        logoUrl={activeLogoUrl}
        primaryColor={activePrimaryColor}
        fontFamily={activeFontFamily}
        clientName={preview.enabled ? null : clientName}
        clientAvatarUrl={preview.enabled ? null : clientAvatarUrl}
      >
        {children}
      </PwaShell>
    </div>
  )
}
