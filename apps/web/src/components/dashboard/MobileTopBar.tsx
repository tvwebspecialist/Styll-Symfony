'use client'

import { usePathname } from 'next/navigation'
import { isDashboardHomePath } from '@/lib/dashboard-path'
import TopBarHome from './TopBarHome'
import TopBarSimple from './TopBarSimple'
import { useNotificationCount } from '@/hooks/useNotificationCount'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface MobileTopBarProps {
  fullName?: string | null
  avatarUrl?: string | null
  unreadCount?: number
  profileId?: string
}

export function MobileTopBar({ fullName, avatarUrl, unreadCount = 0, profileId = '' }: MobileTopBarProps) {
  const pathname = usePathname() ?? ''
  const name = fullName ?? 'Utente'
  const avatar = avatarUrl ?? null
  const { tenantId } = useTenantContext()
  const liveUnreadCount = useNotificationCount(unreadCount, tenantId, profileId, 'mobile')

  if (isDashboardHomePath(pathname)) {
    return <TopBarHome fullName={name} avatarUrl={avatar} unreadCount={liveUnreadCount} />
  }

  return <TopBarSimple fullName={name} avatarUrl={avatar} unreadCount={liveUnreadCount} />
}
