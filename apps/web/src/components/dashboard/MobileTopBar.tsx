'use client'

import { usePathname } from 'next/navigation'
import { isDashboardHomePath } from '@/lib/dashboard-path'
import TopBarHome from './TopBarHome'
import TopBarSimple from './TopBarSimple'

interface MobileTopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
}

export function MobileTopBar({ fullName, avatarUrl }: MobileTopBarProps) {
  const pathname = usePathname() ?? ''
  const name = fullName ?? 'Utente'
  const avatar = avatarUrl ?? null

  if (isDashboardHomePath(pathname)) {
    return <TopBarHome fullName={name} avatarUrl={avatar} />
  }

  return <TopBarSimple fullName={name} avatarUrl={avatar} />
}
