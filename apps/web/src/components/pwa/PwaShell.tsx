'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNavPWA } from './BottomNavPWA'
import { PwaTopBar } from './PwaTopBar'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

const AUTH_SEGMENTS = ['/accesso', '/auth/callback']

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
        <div style={{ paddingBottom: isPrenotaSubroute ? 0 : 96 }}>
          {children}
        </div>
        {!isPrenotaSubroute && (
          <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
        )}
      </div>
    </>
  )
}
