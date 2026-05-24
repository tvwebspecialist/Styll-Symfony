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
  // /book route: BookingFlow manages its own BottomNavPWA and spacing
  const isBookRoute = pathname.startsWith(tenantPath('/book'))

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <>
      {/* Safe area top — same background as page, covers the OS status bar */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 'env(safe-area-inset-top)',
          backgroundColor: '#F7F7F7',
          zIndex: 100,
        }}
      />

      {/* Main content offset below the status bar */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <PwaTopBar
          businessName={businessName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          fontFamily={fontFamily}
          clientName={clientName}
          clientAvatarUrl={clientAvatarUrl}
          slug={slug}
        />
        <div style={{ paddingBottom: isPrenotaSubroute || isBookRoute ? 0 : 96 }}>
          {children}
        </div>
        {!isPrenotaSubroute && !isBookRoute && (
          <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
        )}
        {isPrenotaSubroute && (
          <Suspense fallback={null}>
            <PrenotaFirstStepNavInner slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
          </Suspense>
        )}
      </div>
    </>
  )
}
