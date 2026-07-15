'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  House,
  Calendar,
  Users,
  ShoppingBag,
  Menu,
  X,
  Trophy,
  Megaphone,
  Scissors,
  Smartphone,
  Settings,
  User,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

const MAIN_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: House, exact: true },
  { label: 'Calendario', href: '/calendario', icon: Calendar },
  { label: 'Clienti', href: '/clienti', icon: Users },
  { label: 'Vendite', href: '/vendite', icon: ShoppingBag },
]

const DRAWER_GRID: NavItem[] = [
  { label: 'Loyalty', href: '/loyalty', icon: Trophy },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Team', href: '/team', icon: Users },
  { label: 'Catalogo', href: '/catalogo', icon: Scissors },
  { label: 'La mia App', href: '/app', icon: Smartphone },
  { label: 'Impostazioni', href: '/impostazioni', icon: Settings },
]

const OWNER_MANAGER_ITEM_HREFS = new Set([
  '/vendite',
  '/marketing',
  '/catalogo',
  '/app',
  '/impostazioni',
])

function isActive(path: string, item: NavItem): boolean {
  return item.exact
    ? path === item.href
    : path === item.href || path.startsWith(item.href + '/')
}

export function BottomNav({
  canAccessManagementSurfaces = true,
}: {
  canAccessManagementSurfaces?: boolean
}) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const mainItems = MAIN_ITEMS.filter((item) =>
    canAccessManagementSurfaces || !OWNER_MANAGER_ITEM_HREFS.has(item.href)
  )
  const drawerItems = DRAWER_GRID.filter((item) =>
    canAccessManagementSurfaces || !OWNER_MANAGER_ITEM_HREFS.has(item.href)
  )

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      <nav
        className="mobile-only"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
          left: 16,
          right: 16,
          height: 90,
          zIndex: 50,
          background: '#222222',
          borderRadius: 100,
          alignItems: 'stretch',
          padding: '0 8px',
          justifyContent: 'space-between',
          overflow: 'hidden',
          boxShadow: '0 8px 28px rgba(0,0,0,0.25)',
        }}
      >
        {mainItems.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                textDecoration: 'none',
                padding: '0 4px',
              }}
            >
              <Icon
                size={26}
                strokeWidth={active ? 2.2 : 1.6}
                color={active ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
                aria-hidden="true"
                style={{ flexShrink: 0, transition: 'color 150ms ease' }}
              />
              <span
                style={{
                  color: active ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  fontSize: 12,
                  fontWeight: active ? 700 : 400,
                  fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                  transition: 'color 150ms ease',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Menu button — same fixed-width column as nav items */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menu"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          <Menu size={26} strokeWidth={1.6} color="rgba(255,255,255,0.45)" aria-hidden="true" />
          <span
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontSize: 12,
              fontWeight: 400,
              fontFamily: 'Outfit, sans-serif',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            Menu
          </span>
        </button>
      </nav>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 60,
          }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 70,
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          padding: `16px 16px max(32px, env(safe-area-inset-bottom, 32px))`,
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: open ? '0 -8px 32px rgba(0,0,0,0.15)' : 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 2,
            margin: '0 auto 20px',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, color: '#222222' }}>Menu</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Chiudi"
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
            }}
          >
            <X size={18} color="#222222" />
          </button>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          {drawerItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  borderRadius: 12,
                  background: '#F9F9F9',
                  fontSize: 14,
                  color: '#222222',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                <Icon size={20} color="#222222" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        <div style={{ height: 1, background: '#F0F0F0', margin: '8px 0 12px' }} />

        <Link
          href="/profilo"
          onClick={() => setOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderRadius: 12,
            background: '#F9F9F9',
            fontSize: 14,
            color: '#222222',
            textDecoration: 'none',
            fontWeight: 500,
            marginBottom: 8,
          }}
        >
          <User size={20} color="#222222" />
          <span>Profilo</span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '14px 16px',
            borderRadius: 12,
            background: '#F9F9F9',
            fontSize: 14,
            color: '#DC2626',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 500,
            width: '100%',
            textAlign: 'left',
          }}
        >
          <LogOut size={20} color="#DC2626" />
          <span>Logout</span>
        </button>
      </div>
    </>
  )
}
