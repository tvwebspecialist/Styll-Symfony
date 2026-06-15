'use client'

import { usePathname } from 'next/navigation'
import { isDashboardHomePath } from '@/lib/dashboard-path'
import TopBarHome from './TopBarHome'
import TopBarSimple from './TopBarSimple'

interface MobileTopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
  unreadCount?: number
}

export function MobileTopBar({ fullName, avatarUrl, unreadCount = 0 }: MobileTopBarProps) {
  const pathname = usePathname() ?? ''
  const name = fullName ?? 'Utente'
  const avatar = avatarUrl ?? null

  if (isDashboardHomePath(pathname)) {
    return <TopBarHome fullName={name} avatarUrl={avatar} unreadCount={unreadCount} />
  }

  return <TopBarSimple fullName={name} avatarUrl={avatar} unreadCount={unreadCount} />
}
