'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNavPWA } from './BottomNavPWA'
import { PwaTopBar } from './PwaTopBar'

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
  const isAuthPage = AUTH_SEGMENTS.some((seg) => pathname.includes(seg))

  if (isAuthPage) {
    return <>{children}</>
  }

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
      <div style={{ paddingBottom: 96 }}>
        {children}
      </div>
      <BottomNavPWA slug={slug} primaryColor={primaryColor} fontFamily={fontFamily} />
    </>
  )
}
