'use client'

import * as React from 'react'

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

const MOBILE_STYLE: React.CSSProperties = {
  margin: 0,
  paddingTop: 76,
  paddingBottom: 96,
  paddingLeft: 16,
  paddingRight: 16,
  background: 'transparent',
  borderRadius: 0,
  height: 'auto',
}

export function MainContent({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const style = isMobile === null
    ? DESKTOP_STYLE
    : isMobile
      ? MOBILE_STYLE
      : DESKTOP_STYLE

  return <main style={style}>{children}</main>
}
