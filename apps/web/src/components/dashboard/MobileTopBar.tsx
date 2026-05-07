'use client'

import { usePathname } from 'next/navigation'
import TopBarHome from './TopBarHome'
import TopBarSimple from './TopBarSimple'

interface MobileTopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
}

/**
 * Detects whether the current path is the dashboard home page.
 * In production the subdomain rewrite maps to /tenant/dashboard/[slug].
 * In development the query-param fallback produces the same path.
 */
function isHomePage(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  // /tenant/dashboard/[slug] → exactly ['tenant', 'dashboard', slug]
  return parts.length === 3 && parts[0] === 'tenant' && parts[1] === 'dashboard'
}

export function MobileTopBar({ fullName, avatarUrl }: MobileTopBarProps) {
  const pathname = usePathname() ?? ''
  const name = fullName ?? 'Utente'
  const avatar = avatarUrl ?? null

  if (isHomePage(pathname)) {
    return <TopBarHome fullName={name} avatarUrl={avatar} />
  }

  return <TopBarSimple fullName={name} avatarUrl={avatar} />
}
