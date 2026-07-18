'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  type LucideIcon,
} from 'lucide-react'
import { FloatingCard } from '@/components/pwa/FloatingCard'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

const MAIN_ITEMS: NavItem[] = [
  { label: 'Home',       href: '/',          icon: House,      exact: true },
  { label: 'Calendario', href: '/calendario', icon: Calendar },
  { label: 'Vendite',    href: '/vendite',    icon: ShoppingBag },
]

const CARD_GRID: NavItem[] = [
  { label: 'Clienti',     href: '/clienti',      icon: Users },
  { label: 'Loyalty',     href: '/loyalty',      icon: Trophy },
  { label: 'Marketing',   href: '/marketing',    icon: Megaphone },
  { label: 'Team',        href: '/team',         icon: Users },
  { label: 'Catalogo',    href: '/catalogo',     icon: Scissors },
  { label: 'La mia App',  href: '/app',          icon: Smartphone },
  { label: 'Impostazioni',href: '/impostazioni', icon: Settings },
  { label: 'Profilo',     href: '/profilo',      icon: User },
]

const OWNER_MANAGER_HREFS = new Set([
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
  const [open, setOpen] = React.useState(false)

  const mainItems = MAIN_ITEMS.filter(
    (item) => canAccessManagementSurfaces || !OWNER_MANAGER_HREFS.has(item.href),
  )
  const cardItems = CARD_GRID.filter(
    (item) => canAccessManagementSurfaces || !OWNER_MANAGER_HREFS.has(item.href),
  )

  return (
    <>
      {/* ── Bottom Nav bar ───────────────────────────────────────── */}
      <nav
        className="mobile-only"
        style={{
          display: 'none',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: 64,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          boxSizing: 'content-box',
          zIndex: 50,
          background: '#FFFFFF',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 20px rgba(0,0,0,0.08)',
          alignItems: 'stretch',
          justifyContent: 'space-between',
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
                gap: 4,
                minHeight: 44,
                textDecoration: 'none',
                padding: '0 4px',
              }}
            >
              <Icon
                size={20}
                strokeWidth={active ? 2.3 : 1.6}
                color={active ? '#111111' : 'rgba(0,0,0,0.35)'}
                aria-hidden="true"
              />
              <span
                style={{
                  color: active ? '#111111' : 'rgba(0,0,0,0.35)',
                  fontSize: 11,
                  fontWeight: active ? 700 : 400,
                  fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}

        {/* Menu button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          aria-expanded={open}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            minHeight: 44,
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '0 4px',
          }}
        >
          <Menu
            size={20}
            strokeWidth={open ? 2.3 : 1.6}
            color={open ? '#111111' : 'rgba(0,0,0,0.35)'}
            aria-hidden="true"
          />
          <span
            style={{
              color: open ? '#111111' : 'rgba(0,0,0,0.35)',
              fontSize: 11,
              fontWeight: open ? 700 : 400,
              fontFamily: 'Outfit, sans-serif',
              whiteSpace: 'nowrap',
              lineHeight: 1,
            }}
          >
            Menu
          </span>
        </button>
      </nav>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.42)',
          zIndex: 60,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.20s ease',
        }}
      />

      {/* ── FloatingCard menu ────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 'calc(var(--bottom-nav-height, 64px) + env(safe-area-inset-bottom, 0px) + 8px)',
          zIndex: 70,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.97)',
          transformOrigin: 'bottom center',
          transition: open
            ? 'opacity 0.20s ease, transform 0.20s ease'
            : 'opacity 0.15s ease, transform 0.15s ease',
        }}
      >
        <FloatingCard
          style={{
            margin: 0,
            borderRadius: 20,
            padding: '16px 16px 20px',
            maxHeight: 'calc(100dvh - var(--bottom-nav-height, 64px) - env(safe-area-inset-bottom, 0px) - 72px)',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 14,
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, color: '#222222' }}>Menu</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Chiudi menu"
              style={{
                border: 'none',
                background: '#F5F5F5',
                borderRadius: '50%',
                width: 28,
                height: 28,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <X size={14} color="#555555" />
            </button>
          </div>

          {/* Grid — 8 items (4×2), Profilo included */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
            }}
          >
            {cardItems.map((item) => {
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
                    padding: '14px 14px',
                    borderRadius: 12,
                    background: '#F7F7F7',
                    fontSize: 14,
                    color: '#222222',
                    textDecoration: 'none',
                    fontWeight: 500,
                    minHeight: 44,
                  }}
                >
                  <Icon size={19} color="#444444" aria-hidden="true" />
                  <span style={{ lineHeight: 1.2 }}>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </FloatingCard>
      </div>
    </>
  )
}
