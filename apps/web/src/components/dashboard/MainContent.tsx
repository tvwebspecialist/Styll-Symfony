'use client'

import * as React from 'react'
import { usePathname } from 'next/navigation'
import { isDashboardHomePath } from '@/lib/dashboard-path'

const DESKTOP_STYLE: React.CSSProperties = {
  marginTop: 104,
  marginLeft: 252,
  marginRight: 16,
  marginBottom: 16,
  background: '#FFFFFF',
  borderRadius: 20,
  padding: 24,
  height: 'fit-content',
  // 'clip' prevents horizontal overflow from escaping to the body without creating a
  // scroll container — so position:sticky on descendants continues to work correctly.
  // Do NOT use 'hidden' or 'auto' here: those create scroll containers which break sticky.
  overflow: 'clip',
}

// Home page: fills viewport height — bicolonna layout handles inner scroll
const DESKTOP_HOME_STYLE: React.CSSProperties = {
  marginTop: 104,
  marginLeft: 252,
  marginRight: 16,
  marginBottom: 16,
  background: 'transparent',
  borderRadius: 0,
  padding: 0,
  height: 'calc(100vh - 120px)',
  overflow: 'hidden',
}

/**
 * Home topbar (glass morphism) — 3-row layout:
 *   safe-area + paddingTop(14) + row1(48+16) + row2(~68+16) + row3(44) + paddingBottom(18) ≈ 224px
 *
 * Simple topbar (other pages) — 1-row layout:
 *   paddingTop(10) + avatar(44) + paddingBottom(12) = 66px (safe-area added by formula)
 */
const MOBILE_HOME_PADDING_TOP = 'calc(var(--mobile-home-topbar-height, 224px) + env(safe-area-inset-top, 0px))'
const MOBILE_SIMPLE_PADDING_TOP = 'calc(var(--mobile-simple-topbar-height, 96px) + env(safe-area-inset-top, 0px))'

export function MainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isHome = isDashboardHomePath(pathname)
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
    paddingTop: isHome ? MOBILE_HOME_PADDING_TOP : MOBILE_SIMPLE_PADDING_TOP,
    paddingBottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
    paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
    paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
    background: 'transparent',
    borderRadius: 0,
    height: 'auto',
  }

  const desktopStyle = isHome ? DESKTOP_HOME_STYLE : DESKTOP_STYLE

  const style = isMobile === null
    ? desktopStyle
    : isMobile
      ? mobileStyle
      : desktopStyle

  return <main style={style}>{children}</main>
}
