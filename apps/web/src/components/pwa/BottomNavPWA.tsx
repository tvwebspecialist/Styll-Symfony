'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarFold, ShoppingBag, User } from 'lucide-react'
import { useTenantPath } from '@/lib/hooks/use-tenant-path'

interface BottomNavPWAProps {
  slug: string
  primaryColor?: string | null
  fontFamily?: string | null
}

const NAV_ITEMS = [
  { label: 'Home', icon: Home, relative: '', exact: true },
  { label: 'Prenota', icon: CalendarFold, relative: '/prenota', exact: false },
  { label: 'Prodotti', icon: ShoppingBag, relative: '/prodotti', exact: false },
  { label: 'Profilo', icon: User, relative: '/profilo', exact: false },
]

export function BottomNavPWA({ slug, primaryColor: _primaryColor, fontFamily }: BottomNavPWAProps) {
  const pathname = usePathname()
  const tenantPath = useTenantPath(slug)

  return (
    <>
      {/* Spacer */}
      <div style={{ height: 'calc(72px + 24px + env(safe-area-inset-bottom, 0px))' }} />

      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 16,
            marginRight: 16,
            width: 'calc(100% - 32px)',
            height: 72,
            padding: '5px 5px',
            backgroundColor: '#222222',
            borderRadius: 100,
            boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
          }}
        >
          {NAV_ITEMS.map(({ label, icon: Icon, relative, exact }) => {
            const href = tenantPath(relative)
            const isActive = exact ? pathname === href : pathname.startsWith(href)

            return (
              <Link
                key={label}
                href={href}
                aria-label={label}
                style={{
                  flex: isActive ? '0 0 auto' : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: isActive ? 8 : 0,
                    backgroundColor: isActive ? '#FFFFFF' : 'transparent',
                    borderRadius: 100,
                    padding: isActive ? '0px 18px' : '0',
                    width: isActive ? 'auto' : 52,
                    height: isActive ? 62 : 52,
                    overflow: 'hidden',
                    transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon
                    size={isActive ? 22 : 24}
                    strokeWidth={isActive ? 2.2 : 1.6}
                    color={isActive ? '#222222' : 'rgba(255,255,255,0.6)'}
                    style={{ flexShrink: 0 }}
                  />
                  <span
                    style={{
                      color: '#222222',
                      fontSize: 15,
                      fontWeight: 700,
                      fontFamily: fontFamily ?? 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      maxWidth: isActive ? 120 : 0,
                      opacity: isActive ? 1 : 0,
                      transition: 'all 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
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
