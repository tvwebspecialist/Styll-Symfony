'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  Eye,
  X,
  type LucideIcon,
} from 'lucide-react'

import { GlobalSearch } from '@/components/admin/global-search'
import { stopTenantImpersonation } from '@/app/admin/actions'

// ─── Nav config ──────────────────────────────────────────────
interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  match?: (pathname: string) => boolean
  countKey?: 'tenants' | 'users'
}

interface NavSection {
  label: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    label: 'Operatività',
    items: [
      { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, match: (p) => p === '/admin' },
      { label: 'Tenants', href: '/admin/tenants', icon: Building2, countKey: 'tenants' },
      { label: 'Utenti', href: '/admin/users', icon: Users, countKey: 'users' },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { label: 'Piani', href: '/admin/subscription-plans', icon: CreditCard },
      { label: 'Impostazioni', href: '/admin/settings', icon: Settings },
      { label: 'Aiuto', href: '/admin/help', icon: HelpCircle },
    ],
  },
]

const MOBILE_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { label: 'Tenants', href: '/admin/tenants', icon: Building2 },
  { label: 'Utenti', href: '/admin/users', icon: Users },
  { label: 'Piani', href: '/admin/subscription-plans', icon: CreditCard },
  { label: 'Impostazioni', href: '/admin/settings', icon: Settings },
]

// ─── Types ───────────────────────────────────────────────────
export interface AdminCounts {
  tenants?: number
  users?: number
}

interface AdminShellProps {
  children: React.ReactNode
  email: string | null
  onSignOut: () => Promise<void>
  counts?: AdminCounts
  impersonation?: { tenantName: string; tenantId: string } | null
}

// ─── Helpers ─────────────────────────────────────────────────
function isActive(pathname: string, item: NavItem): boolean {
  return item.match
    ? item.match(pathname)
    : pathname === item.href || pathname.startsWith(item.href + '/')
}

// ─── SidebarLink ─────────────────────────────────────────────
function SidebarLink({
  item,
  active,
  badge,
}: {
  item: NavItem
  active: boolean
  badge?: number
}) {
  const [hover, setHover] = React.useState(false)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 14,
        fontWeight: 500,
        padding: '10px 12px',
        borderRadius: 8,
        textDecoration: 'none',
        transition: 'background 120ms ease, color 120ms ease',
        background: active
          ? 'var(--sidebar-item-active-bg)'
          : hover
            ? 'var(--sidebar-item-hover-bg)'
            : 'transparent',
        color: active ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-item-text)',
      }}
    >
      <Icon size={18} color={active ? 'var(--sidebar-item-active-text)' : 'currentColor'} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {typeof badge === 'number' && (
        <span
          style={{
            background: active ? 'rgba(255,255,255,0.15)' : 'var(--sidebar-item-hover-bg)',
            color: active ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-section-label)',
            borderRadius: 999,
            padding: '1px 7px',
            fontSize: 10,
            fontWeight: 600,
          }}
        >
          {badge}
        </span>
      )}
    </Link>
  )
}

// ─── AdminShell ───────────────────────────────────────────────
export function AdminShell({
  children,
  email,
  onSignOut,
  counts,
  impersonation,
}: AdminShellProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const [signingOut, setSigningOut] = React.useState(false)
  const [exitingImpersonation, setExitingImpersonation] = React.useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    await onSignOut()
  }

  const handleExitImpersonation = async () => {
    setExitingImpersonation(true)
    await stopTenantImpersonation()
    router.push('/admin')
    setExitingImpersonation(false)
  }

  // Initials from email
  const initials = email
    ? email.split('@')[0].slice(0, 2).toUpperCase()
    : 'AD'

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--sidebar-bg)',
        fontFamily: 'var(--font-primary)',
        color: 'var(--sidebar-item-text)',
      }}
    >
      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside
        style={{
          display: 'none',
          flexDirection: 'column',
          flexShrink: 0,
          padding: 16,
          width: 'var(--sidebar-width)',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 40,
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
        className="md:!flex"
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            borderRadius: 20,
            background: 'var(--sidebar-bg)',
            border: '1px solid var(--sidebar-border)',
            padding: '0 0 8px 0',
            overflow: 'hidden',
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              height: 60,
              padding: '0 20px',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--sidebar-item-text)' }}>
              Styll
            </span>
            <span className="rounded-md bg-red-900/40 px-2 py-0.5 text-[10px] font-bold tracking-widest text-red-400">
              ADMIN
            </span>
          </div>

          {/* Nav */}
          <nav style={{ flex: 1, padding: '0 12px', overflowY: 'auto', scrollbarWidth: 'none' }}>
            {SECTIONS.map((section, idx) => (
              <div key={section.label}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--sidebar-section-label)',
                    padding: `${idx === 0 ? 8 : 16}px 12px 6px`,
                  }}
                >
                  {section.label}
                </div>
                {section.items.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={isActive(pathname, item)}
                    badge={item.countKey ? counts?.[item.countKey] : undefined}
                  />
                ))}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--sidebar-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  background: 'var(--sidebar-item-hover-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--sidebar-item-text)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--sidebar-section-label)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {email ?? '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                background: 'var(--sidebar-item-hover-bg)',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--sidebar-item-text)',
                cursor: 'pointer',
                opacity: signingOut ? 0.5 : 1,
                transition: 'background 120ms ease',
              }}
            >
              <LogOut size={13} />
              {signingOut ? 'Uscita…' : 'Esci'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────── */}
      <div
        style={{ display: 'flex', flex: 1, flexDirection: 'column' }}
        className="md:ml-[var(--sidebar-width)]"
      >
        {/* TopBar */}
        <header style={{ padding: '16px 16px 0' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 60,
              borderRadius: 20,
              background: '#FFFFFF',
              border: '1px solid var(--sidebar-border)',
              padding: '0 20px',
              gap: 12,
            }}
          >
            {/* Mobile brand */}
            <div
              className="flex md:hidden"
              style={{ alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sidebar-item-text)' }}>
                Styll
              </span>
              <span className="rounded-md bg-red-900/40 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-red-400">
                ADMIN
              </span>
            </div>

            {/* Shadow mode pill */}
            {impersonation && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(139,92,246,0.1)',
                  border: '1px solid rgba(139,92,246,0.2)',
                  borderRadius: 999,
                  padding: '4px 10px 4px 8px',
                  flexShrink: 0,
                }}
              >
                <Eye size={13} style={{ color: '#8B5CF6' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#8B5CF6' }}>
                  {impersonation.tenantName}
                </span>
                <button
                  type="button"
                  onClick={handleExitImpersonation}
                  disabled={exitingImpersonation}
                  style={{
                    marginLeft: 2,
                    display: 'flex',
                    alignItems: 'center',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    opacity: exitingImpersonation ? 0.5 : 1,
                  }}
                  aria-label="Esci da shadow mode"
                >
                  <X size={12} style={{ color: '#8B5CF6' }} />
                </button>
              </div>
            )}

            <div style={{ flex: 1 }} />

            <GlobalSearch />

            {/* Admin avatar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span
                className="hidden sm:inline"
                style={{ fontSize: 12, color: 'var(--sidebar-section-label)' }}
              >
                {email ?? '—'}
              </span>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: 'var(--sidebar-item-hover-bg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--sidebar-item-text)',
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
            </div>
          </div>
        </header>

        <main style={{ flex: 1, overflowX: 'auto', padding: '16px 16px 96px' }}>
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 pt-2 md:hidden"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid var(--sidebar-border)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
        }}
      >
        {MOBILE_ITEMS.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '6px 10px',
                borderRadius: 10,
                textDecoration: 'none',
                background: active ? 'var(--sidebar-item-hover-bg)' : 'transparent',
                transition: 'background 120ms ease',
                minWidth: 48,
              }}
            >
              <Icon
                size={20}
                color={active ? 'var(--sidebar-item-active-bg)' : 'var(--sidebar-section-label)'}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--sidebar-item-active-bg)' : 'var(--sidebar-section-label)',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
