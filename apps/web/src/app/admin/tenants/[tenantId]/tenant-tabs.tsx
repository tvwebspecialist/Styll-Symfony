'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { cn } from '@/lib/utils'

interface Props {
  tenantId: string
  tabs: { href: string; label: string }[]
}

export function TenantTabs({ tenantId, tabs }: Props) {
  const pathname = usePathname() ?? ''
  const base = `/admin/tenants/${tenantId}`
  return (
    <div className="flex flex-wrap gap-1 border-b">
      {tabs.map((t) => {
        const href = `${base}${t.href}`
        const active = t.href === '' ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={t.href || 'overview'}
            href={href}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              active
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
