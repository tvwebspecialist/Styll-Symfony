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

  if (isAuthPage) {
    return <>{children}</>
  }

  // safe area: la gestiscono direttamente la PwaTopBar (glassShell paddingTop)
  // e la hero full-bleed dello step servizi — qui niente strip grigia né padding
  // top, altrimenti il glass non risale sotto la status bar (doppio conteggio).
  return (
    <>
      <PwaTopBar
        businessName={businessName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        fontFamily={fontFamily}
        clientName={clientName}
        clientAvatarUrl={clientAvatarUrl}
        slug={slug}
      />
      <div style={{ paddingBottom: isPrenotaSubroute ? 0 : 96 }}>
        {children}
      </div>
      {!isPrenotaSubroute && (
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
