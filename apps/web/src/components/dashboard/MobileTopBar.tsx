'use client'

import { usePathname } from 'next/navigation'
import { isDashboardHomePath, getDashboardDetailTitle } from '@/lib/dashboard-path'
import TopBarHome from './TopBarHome'
import TopBarSimple from './TopBarSimple'
import TopBarDetail from './TopBarDetail'

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

  const detailTitle = getDashboardDetailTitle(pathname)
  if (detailTitle) {
    return <TopBarDetail title={detailTitle} />
  }

  return <TopBarSimple fullName={name} avatarUrl={avatar} />
}
