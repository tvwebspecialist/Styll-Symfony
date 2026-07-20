'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  tenantId: string
  tabs: { href: string; label: string }[]
}

export function TenantTabs({ tenantId, tabs }: Props) {
  const pathname = usePathname() ?? ''
  const base = `/admin/tenants/${tenantId}`

  return (
    <div
      className="flex gap-0 overflow-x-auto border-b [scrollbar-width:none] [-webkit-overflow-scrolling:touch]"
      style={{ borderColor: 'var(--admin-border)' }}
    >
      {tabs.map((t) => {
        const href = `${base}${t.href}`
        const active = t.href === '' ? pathname === base : pathname.startsWith(href)
        return (
          <Link
            key={t.href || 'overview'}
            href={href}
            className="shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              borderBottomColor: active ? 'var(--admin-accent)' : 'transparent',
              color: active ? 'var(--admin-accent)' : 'var(--admin-text-muted)',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {t.label}
          </Link>
        )
      })}
    </div>
  )
}
