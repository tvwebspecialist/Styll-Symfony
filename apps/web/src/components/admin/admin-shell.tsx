'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { GlobalSearch } from '@/components/admin/global-search'
import { DarkModeToggle } from '@/components/admin/dark-mode-toggle'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  match?: (pathname: string) => boolean
  countKey?: 'tenants' | 'users'
}

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, match: (p) => p === '/admin' },
  { label: 'Tenants', href: '/admin/tenants', icon: Building2, countKey: 'tenants' },
  { label: 'Utenti', href: '/admin/users', icon: Users, countKey: 'users' },
  { label: 'Piani', href: '/admin/subscription-plans', icon: CreditCard },
  { label: 'Impostazioni', href: '/admin/settings', icon: Settings },
  { label: 'Aiuto', href: '/admin/help', icon: HelpCircle },
]

export interface AdminCounts {
  tenants?: number
  users?: number
}

interface AdminShellProps {
  children: React.ReactNode
  email: string | null
  onSignOut: () => Promise<void>
  counts?: AdminCounts
}

export function AdminShell({ children, email, onSignOut, counts }: AdminShellProps) {
  const pathname = usePathname()
  const [signingOut, setSigningOut] = React.useState(false)

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="hidden w-60 flex-col border-r border-zinc-800 bg-[#0A0A0F] text-zinc-100 md:flex">
        <div className="flex h-14 items-center px-5 text-base font-semibold tracking-tight">
          <span className="rounded-md bg-[#E94560] px-1.5 py-0.5 text-xs text-white">S</span>
          <span className="ml-2">Styll Admin</span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2 py-3">
          {NAV.map((item) => {
            const active = item.match
              ? item.match(pathname ?? '')
              : (pathname ?? '').startsWith(item.href)
            const Icon = item.icon
            const badge = item.countKey ? counts?.[item.countKey] : undefined
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-[#1A1A2E] text-white'
                    : 'text-zinc-400 hover:bg-[#1A1A2E]/60 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{item.label}</span>
                {typeof badge === 'number' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                      active
                        ? 'bg-white/15 text-white'
                        : 'bg-zinc-800 text-zinc-300'
                    )}
                  >
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="border-t border-zinc-800 px-3 py-3">
          <div className="truncate text-[11px] text-zinc-500">{email ?? '—'}</div>
          <form
            action={async () => {
              setSigningOut(true)
              await onSignOut()
            }}
            className="mt-1.5"
          >
            <button
              type="submit"
              disabled={signingOut}
              className="inline-flex w-full items-center gap-1.5 rounded-md bg-zinc-800 px-2.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              {signingOut ? '…' : 'Esci'}
            </button>
          </form>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-sm font-semibold dark:text-zinc-100">Styll Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <GlobalSearch />
            <DarkModeToggle />
            <span className="hidden text-xs text-zinc-600 sm:inline dark:text-zinc-400">
              {email ?? '—'}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-x-auto p-6 dark:text-zinc-100">{children}</main>
      </div>
    </div>
  )
}
