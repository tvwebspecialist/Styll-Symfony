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
  BarChart2,
  Key,
  Database,
  type LucideIcon,
} from 'lucide-react'

import { GlobalSearch } from '@/components/admin/global-search'
import { NotificationBell } from '@/components/admin/notification-bell'
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
      { label: 'Barbieri', href: '/admin/tenants', icon: Building2, countKey: 'tenants' },
      { label: 'Team Styll', href: '/admin/users', icon: Users, countKey: 'users' },
      { label: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { label: 'Piani', href: '/admin/subscription-plans', icon: CreditCard },
      { label: 'Onboarding', href: '/admin/onboarding-tokens', icon: Key },
      { label: 'Backup DB', href: '/admin/backups', icon: Database },
      { label: 'Impostazioni', href: '/admin/settings', icon: Settings },
      { label: 'Aiuto', href: '/admin/help', icon: HelpCircle },
    ],
  },
]

const MOBILE_TABS: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { label: 'Barbieri', href: '/admin/tenants', icon: Building2 },
  { label: 'Team Styll', href: '/admin/users', icon: Users },
  { label: 'Piani', href: '/admin/subscription-plans', icon: CreditCard },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
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
  initialUnreadCount?: number
}

// ─── Helpers ─────────────────────────────────────────────────
function isActive(pathname: string, item: NavItem): boolean {
  return item.match
    ? item.match(pathname)
    : pathname === item.href || pathname.startsWith(item.href + '/')
}

function initials(email: string | null): string {
  if (!email) return 'AD'
  return email.split('@')[0].slice(0, 2).toUpperCase()
}

// ─── SidebarNavItem ──────────────────────────────────────────
function SidebarNavItem({
  item,
  active,
  count,
}: {
  item: NavItem
  active: boolean
  count?: number
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
        active ? 'admin-nav-active' : 'admin-nav-inactive'
      }`}
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 font-medium">{item.label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="rounded-full styll-bg-admin-accent px-2 py-0.5 text-[10px] font-bold text-white tabular-nums">
          {count > 999 ? '999+' : count}
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
  initialUnreadCount = 0,
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

  const userInitials = initials(email)

  return (
    <div
      className="min-h-screen font-[family-name:var(--font-primary)]"
      style={{ background: 'var(--admin-bg)', color: 'var(--admin-text)' }}
    >
      {/* ── Desktop Sidebar ──────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden flex-col md:flex"
        style={{ width: 'var(--admin-sidebar-width)' }}
      >
        <div
          className="flex h-full flex-col overflow-hidden border-r"
          style={{
            background: 'var(--admin-sidebar-bg)',
            borderColor: 'var(--admin-border)',
          }}
        >
          {/* Brand */}
          <div className="flex h-16 shrink-0 items-center gap-2 border-b px-5"
            style={{ borderColor: 'var(--admin-border)' }}>
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: 'var(--admin-text)', fontFamily: 'var(--font-primary)' }}
            >
              Styll
            </span>
            <span className="rounded-md styll-bg-admin-accent px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-white">
              ADMIN
            </span>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 [scrollbar-width:none]">
            {SECTIONS.map((section, idx) => (
              <div key={section.label} className={idx > 0 ? 'mt-6' : ''}>
                <p
                  className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--admin-text-subtle)' }}
                >
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <SidebarNavItem
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item)}
                      count={item.countKey ? counts?.[item.countKey] : undefined}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div
            className="shrink-0 border-t p-3"
            style={{ borderColor: 'var(--admin-border)' }}
          >
            <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                style={{
                  background: 'var(--admin-surface-2)',
                  color: 'var(--admin-text)',
                }}
              >
                {userInitials}
              </div>
              <span
                className="truncate text-xs"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                {email ?? '—'}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition-colors styll-hover-admin-hover-bg disabled:opacity-50"
              style={{ color: 'var(--admin-text-muted)' }}
            >
              <LogOut size={13} />
              {signingOut ? 'Uscita…' : 'Esci'}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ──────────────────────────────────── */}
      <div className="flex flex-1 flex-col md:pl-[var(--admin-sidebar-width)]">
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 md:px-6"
          style={{
            height: 'var(--admin-topbar-height)',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderColor: 'var(--admin-border)',
          }}
        >
          {/* Mobile brand */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-sm font-bold" style={{ color: 'var(--admin-text)' }}>
              Styll
            </span>
            <span className="rounded styll-bg-admin-accent px-1 py-0.5 text-[9px] font-bold tracking-widest text-white">
              ADMIN
            </span>
          </div>

          {/* Shadow mode pill */}
          {impersonation && (
            <div
              className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{
                background: 'rgba(139,92,246,0.08)',
                borderColor: 'rgba(139,92,246,0.2)',
                color: '#8B5CF6',
              }}
            >
              <Eye size={12} />
              <span>{impersonation.tenantName}</span>
              <button
                type="button"
                onClick={handleExitImpersonation}
                disabled={exitingImpersonation}
                className="ml-1 flex items-center opacity-70 hover:opacity-100 disabled:opacity-40"
                aria-label="Esci da shadow mode"
              >
                <X size={11} />
              </button>
            </div>
          )}

          <div className="flex-1" />

          <GlobalSearch />
          <NotificationBell initialUnreadCount={initialUnreadCount} />

          {/* Avatar */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
            style={{ background: 'var(--admin-surface-2)', color: 'var(--admin-text)' }}
          >
            {userInitials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 pb-28 md:px-6 md:pb-6">
          {children}
        </main>
      </div>

      {/* ── Mobile Bottom Tab Bar ─────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t md:hidden"
        style={{
          background: 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'var(--admin-border)',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))',
          paddingTop: '8px',
        }}
      >
        {MOBILE_TABS.map((item) => {
          const active = isActive(pathname, item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex min-w-[48px] flex-col items-center gap-1 rounded-xl px-2 py-1 transition-colors"
              aria-label={item.label}
            >
              <Icon
                size={20}
                style={{ color: active ? 'var(--admin-accent)' : 'var(--admin-text-subtle)' }}
              />
              <span
                className="text-[10px] font-semibold"
                style={{
                  color: active ? 'var(--admin-accent)' : 'var(--admin-text-subtle)',
                  fontWeight: active ? 700 : 500,
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
