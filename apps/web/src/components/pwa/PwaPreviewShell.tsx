'use client'

import * as React from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { PwaShell } from '@/components/pwa/PwaShell'
import { PwaSplash } from '@/components/pwa/PwaSplash'
import PwaInstallBanner from '@/components/pwa/PwaInstallBanner'
import { PwaSessionRestorer } from '@/components/pwa/PwaSessionRestorer'
import { PwaServiceWorkerRegistrar } from '@/components/pwa/PwaServiceWorkerRegistrar'
import { readPwaPreviewConfig } from '@/lib/pwa-preview'
import { GOOGLE_FONT_URLS, resolveFontFamily } from '@/lib/pwa-fonts'

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
  const activeFontFamily = resolveFontFamily(activeFontKey)

  React.useEffect(() => {
    // Caso A — font persistito (nessun preview_font_family): il <link> è già
    // iniettato server-side nel layout PWA, quindi NON ricarichiamo nulla qui
    // (evita il FOUC per il cliente finale). Applichiamo solo --font-active.
    // Caso B — preview dashboard (preview_font_family presente): carichiamo il
    // font a runtime per la live preview prima del salvataggio.
    if (!preview.fontFamily) return
    ensureGoogleFont(activeFontKey)
  }, [preview.fontFamily, activeFontKey])

  React.useEffect(() => {
    // iOS standalone: registering any touch listener on document unlocks
    // CSS :active pseudo-class, which is suppressed by default in PWA mode.
    const noop = () => {}
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])

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
      style={{ ...brandVars, background: '#ffffff', minHeight: '100dvh' }}
      className="text-foreground [font-family:var(--font-active)]"
    >
      <style>{`
        /* PWA tap feedback — :active unlocked by touchstart listener above */
        button:active:not(:disabled) { opacity: 0.72; }
        .pwa-nav-item:active > div {
          opacity: 0.65;
          transform: scale(0.91);
        }
        @media (prefers-reduced-motion: reduce) {
          button:active:not(:disabled) { opacity: 0.72; transform: none !important; }
          .pwa-nav-item:active > div { transform: none !important; }
        }
      `}</style>
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

      {/* Install banner — shown only when ?install=true is in the URL */}
      {!preview.enabled && (
        <React.Suspense fallback={null}>
          <PwaInstallBanner
            businessName={activeBusinessName}
            logoUrl={activeLogoUrl}
            primaryColor={activePrimaryColor}
          />
        </React.Suspense>
      )}

      {/* Session restorer — syncs localStorage ↔ cookies on every cold launch */}
      {!preview.enabled && (
        <React.Suspense fallback={null}>
          <PwaSessionRestorer />
        </React.Suspense>
      )}

      {/* Service worker — offline-first caching (mai in preview dashboard) */}
      {!preview.enabled && <PwaServiceWorkerRegistrar />}
    </div>
  )
}
