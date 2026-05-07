'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'

const DESKTOP_STYLE: React.CSSProperties = {
  marginTop: 104,
  marginLeft: 252,
  marginRight: 16,
  marginBottom: 16,
  background: '#FFFFFF',
  borderRadius: 20,
  padding: 24,
  height: 'fit-content',
  overflowY: 'auto',
}

/**
 * Home topbar (glass morphism) — new Apple-style taller layout:
 *   paddingTop = max(12px, safe-area) + content (28px×1.2 h1 + 16px×1.4 p + 8px gap + 40px search) + 12px paddingBottom
 *   content ≈ 34 + 22 + 8 + 40 = 104px → total = 116px + max(12px, safe-area)
 *
 * Simple topbar (other pages):
 *   paddingTop = max(12px, safe-area) + ~36px content + 12px paddingBottom
 *   ≈ 60px + safe-area → use calc(64px + max(0px, env(safe-area-inset-top)))
 */
const MOBILE_HOME_PADDING_TOP = 'calc(116px + max(12px, env(safe-area-inset-top)))'
const MOBILE_SIMPLE_PADDING_TOP = 'calc(64px + max(0px, env(safe-area-inset-top)))'

function isHomePage(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  return parts.length === 3 && parts[0] === 'tenant' && parts[1] === 'dashboard'
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const mobileStyle: React.CSSProperties = {
    margin: 0,
    paddingTop: isHomePage(pathname) ? MOBILE_HOME_PADDING_TOP : MOBILE_SIMPLE_PADDING_TOP,
    paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
    background: 'transparent',
    borderRadius: 0,
    height: 'auto',
  }

  const style = isMobile === null
    ? DESKTOP_STYLE
    : isMobile
      ? mobileStyle
      : DESKTOP_STYLE

  return <main style={style}>{children}</main>
}
