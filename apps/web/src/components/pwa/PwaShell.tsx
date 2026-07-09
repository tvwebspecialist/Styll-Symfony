'use client'

import { Suspense, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { BottomNavPWA } from './BottomNavPWA'
import { PwaTopBar } from './PwaTopBar'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

const AUTH_SEGMENTS = ['/accesso', '/auth/callback']

interface PrenotaFirstStepNavProps {
  slug: string
  primaryColor?: string | null
  fontFamily?: string | null
}

// Reads _skip from search params to render BottomNavPWA only on the first visible booking step.
// Must be wrapped in Suspense because it uses useSearchParams().
function PrenotaFirstStepNavInner({ slug, primaryColor, fontFamily }: PrenotaFirstStepNavProps) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const tenantPath = useTenantPath(slug)
  const prenotaBase = tenantPath('/prenota')
  const skipItems = (searchParams?.get('_skip') ?? '').split(',').filter(Boolean)

  const isFirstStep =
    (pathname.startsWith(`${prenotaBase}/barbiere`) && skipItems.includes('sede')) ||
    (pathname.startsWith(`${prenotaBase}/servizi`) &&
      skipItems.includes('sede') &&
      skipItems.includes('barbiere'))

  if (!isFirstStep) return null
  return <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
}

interface PwaShellProps {
  slug: string
  businessName: string
  logoUrl?: string | null
  primaryColor?: string | null
  fontFamily?: string | null
  clientName?: string | null
  clientAvatarUrl?: string | null
  children: ReactNode
}

export function PwaShell({
  slug,
  businessName,
  logoUrl,
  primaryColor,
  fontFamily,
  clientName,
  clientAvatarUrl,
  children,
}: PwaShellProps) {
  const pathname = usePathname() ?? ''
  const tenantPath = useTenantPath(slug)
  const isAuthPage = AUTH_SEGMENTS.some((seg) => pathname.includes(seg))

  // Hide the bottom nav (and its padding) for all prenota subroutes — BottomCTA handles spacing there
  const isPrenotaSubroute = pathname.startsWith(`${tenantPath('/prenota')}/`)
  // Product detail is fullscreen — no bottom nav
  const isProductDetail = pathname.startsWith(`${tenantPath('/prodotti')}/`)
  // Offer detail is fullscreen — no bottom nav (same as product detail)
  const isOfferDetail = pathname.startsWith(`${tenantPath('/offerte')}/`)
  // Edit profile is fullscreen — no bottom nav (BottomCTA handles its own bar)
  const isModificaProfilo = pathname.startsWith(tenantPath('/profilo/modifica'))
  // Notifications page is a sub-page — no bottom nav (consistent with all other sub-pages)
  const isNotifiche = pathname === tenantPath('/notifiche')

  if (isAuthPage) {
    return <>{children}</>
  }

  // safe area: la gestiscono direttamente la PwaTopBar (glassShell paddingTop)
  // e la hero full-bleed dello step servizi — qui niente strip grigia né padding
  // top, altrimenti il glass non risale sotto la status bar (doppio conteggio).
  return (
    <>
      {!(isProductDetail || isOfferDetail) && (
        <PwaTopBar
          businessName={businessName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          clientName={clientName}
          clientAvatarUrl={clientAvatarUrl}
          slug={slug}
        />
      )}
      <div style={{ paddingBottom: (isPrenotaSubroute || isProductDetail || isOfferDetail || isModificaProfilo || isNotifiche) ? 0 : 96 }}>
        {children}
        {!(isPrenotaSubroute || isProductDetail || isOfferDetail || isModificaProfilo || isNotifiche) && (
          <footer style={{ fontSize: 11, color: '#CCCCCC', textAlign: 'center', padding: '24px 0 8px' }}>
            <a
              href="https://styll.it"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#CCCCCC', textDecoration: 'none' }}
            >
              Powered by Styll
            </a>
          </footer>
        )}
      </div>
      {!(isPrenotaSubroute || isProductDetail || isOfferDetail || isModificaProfilo || isNotifiche) && (
        <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
      )}
      {isPrenotaSubroute && (
        <Suspense fallback={null}>
          <PrenotaFirstStepNavInner slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
        </Suspense>
      )}
    </>
  )
}
