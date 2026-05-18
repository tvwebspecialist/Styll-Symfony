'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarPlus, ShoppingBag, User } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface BottomNavPWAProps {
  slug: string
}

const NAV_ITEMS = [
  { label: 'Home', icon: Home, relative: '', exact: true },
  { label: 'Prenota', icon: CalendarPlus, relative: '/prenota', exact: false },
  { label: 'Prodotti', icon: ShoppingBag, relative: '/prodotti', exact: false },
  { label: 'Profilo', icon: User, relative: '/profilo', exact: false },
]

export function BottomNavPWA({ slug }: BottomNavPWAProps) {
  const pathname = usePathname()
  const tenantPath = useTenantPath(slug)

  return (
    <>
      {/* Spacer per non nascondere contenuto sotto la nav */}
      <div style={{ height: 'calc(68px + 16px + env(safe-area-inset-bottom, 0px))' }} />

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex justify-center"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div
          className="flex w-full items-center px-2"
          style={{
            marginLeft: 16,
            marginRight: 16,
            height: 68,
            backgroundColor: '#111111',
            borderRadius: 20,
          }}
        >
          {NAV_ITEMS.map(({ label, icon: Icon, relative, exact }) => {
            const href = tenantPath(relative)
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href)

            return (
              <Link
                key={label}
                href={href}
                className="flex flex-1 flex-col items-center justify-center gap-[3px] py-3"
                style={{ minHeight: 44 }}
              >
                {/* Background highlight sul tab attivo */}
                <div
                  className="flex flex-col items-center justify-center gap-[3px]"
                  style={{
                    paddingLeft: 12,
                    paddingRight: 12,
                    paddingTop: 6,
                    paddingBottom: 6,
                    borderRadius: 12,
                    backgroundColor: isActive ? '#2a2a2a' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    color={isActive ? '#ffffff' : '#666666'}
                  />
                  <span
                    className="text-[10px] font-semibold tracking-widest uppercase"
                    style={{
                      color: isActive ? '#ffffff' : '#666666',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
