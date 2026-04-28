import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[]
  className?: string
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-xs', className)}>
      {items.map((item, idx) => {
        const last = idx === items.length - 1
        return (
          <span key={`${item.label}-${idx}`} className="flex items-center gap-1">
            {item.href && !last ? (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ) : (
              <span className={last ? 'font-medium text-foreground' : 'text-muted-foreground'}>
                {item.label}
              </span>
            )}
            {!last ? <ChevronRight className="h-3 w-3 text-muted-foreground/50" /> : null}
          </span>
        )
      })}
    </nav>
  )
}
