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
  children: ReactNode
}

export function PwaShell({ slug, businessName, logoUrl, primaryColor, children }: PwaShellProps) {
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
        slug={slug}
      />
      <div style={{ paddingTop: 'calc(68px + env(safe-area-inset-top, 0px))', paddingBottom: 96 }}>
        {children}
      </div>
      <BottomNavPWA slug={slug} />
    </>
  )
}
