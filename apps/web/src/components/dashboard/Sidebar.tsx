'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  House,
  Calendar,
  Users,
  ShoppingBag,
  Trophy,
  Megaphone,
  User,
  Scissors,
  Smartphone,
  Settings,
  type LucideIcon,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  exact?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
}

const SECTIONS: NavSection[] = [
  {
    label: 'Operatività',
    items: [
      { label: 'Dashboard', href: '/', icon: House, exact: true },
      { label: 'Calendario', href: '/calendario', icon: Calendar },
      { label: 'Clienti', href: '/clienti', icon: User },
      { label: 'Vendite', href: '/vendite', icon: ShoppingBag },
    ],
  },
  {
    label: 'Crescita',
    items: [
      { label: 'Loyalty', href: '/loyalty', icon: Trophy },
      { label: 'Marketing', href: '/marketing', icon: Megaphone },
      { label: 'Team', href: '/team', icon: Users },
    ],
  },
  {
    label: 'Configurazione',
    items: [
      { label: 'Catalogo', href: '/catalogo', icon: Scissors },
      { label: 'La mia App', href: '/app', icon: Smartphone },
      { label: 'Impostazioni', href: '/impostazioni', icon: Settings },
    ],
  },
]

interface SidebarProps {
  currentPath?: string
}

export function Sidebar({ currentPath }: SidebarProps) {
  const pathname = usePathname()
  const path = currentPath ?? pathname ?? ''

  return (
    <aside
      className="desktop-sidebar"
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        flexShrink: 0,
        padding: 16,
        borderRadius: 20,
        background: 'var(--sidebar-bg)',
        margin: '0px 0 16px 16px',
        gap: 10,
        overflowY: 'auto',
        position: 'fixed',
        top: 104,
        left: 0,
        height: 'calc(100vh - 104px - 16px)',
        zIndex: 40,
        width: 'var(--sidebar-width)',
        scrollbarWidth: 'none',
      }}
    >
      <nav style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
        {SECTIONS.map((section, sectionIndex) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--sidebar-section-label)',
                padding: `${sectionIndex === 0 ? 0 : 16}px 12px 6px`,
              }}
            >
              {section.label}
            </div>
            {section.items.map((item) => {
              const active = item.exact
                ? path === item.href
                : path === item.href || path.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <SidebarLink key={item.href} item={item} active={active} Icon={Icon} />
              )
            })}
          </div>
        ))}
      </nav>

      <div
        style={{
          marginTop: 'auto',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--sidebar-cta-bg)',
          color: 'var(--sidebar-cta-text)',
          borderRadius: 12,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              lineHeight: '26px',
              letterSpacing: '-0.44px',
              color: '#FBFBFB',
              fontFamily: 'inherit',
              marginBottom: 26,
            }}
          >
            Passa al piano Growth.
          </div>
        </div>
        <Link
          href="/impostazioni/piano"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FFFFFF',
            color: '#111111',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            fontWeight: 600,
            textDecoration: 'none',
            width: '100%',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          Scopri di più
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/img/Upgrade.png"
          alt=""
          style={{
            position: 'absolute',
            bottom: 8,
            right: -10,
            width: 120,
            height: 'auto',
            pointerEvents: 'none',
          }}
        />
      </div>
    </aside>
  )
}

function SidebarLink({
  item,
  active,
  Icon,
}: {
  item: NavItem
  active: boolean
  Icon: LucideIcon
}) {
  const [hover, setHover] = React.useState(false)
  const bg = active
    ? 'var(--sidebar-item-active-bg)'
    : hover
      ? 'var(--sidebar-item-hover-bg)'
      : 'transparent'
  const color = active ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-item-text)'

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
        color,
        background: bg,
        padding: '10px 12px',
        borderRadius: 8,
        textDecoration: 'none',
        transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      <Icon size={18} color={active ? '#FFFFFF' : 'currentColor'} />
      <span>{item.label}</span>
    </Link>
  )
}
