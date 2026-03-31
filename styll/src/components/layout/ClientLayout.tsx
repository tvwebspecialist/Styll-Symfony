import React from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Calendar, Clock, Star, User } from 'lucide-react'
import { useTenant } from '../../hooks/useTenant'
import { ToastContainer } from '../ui/Toast'

interface MobileNavItem {
  label: string
  icon: React.ReactNode
  to: string
}

interface ClientLayoutProps {
  tenantSlug?: string
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ tenantSlug = '' }) => {
  const { tenant } = useTenant()

  const navItems: MobileNavItem[] = [
    { label: 'Prenota', icon: <Calendar className="w-5 h-5" />, to: `/${tenantSlug}/booking` },
    { label: 'Appuntamenti', icon: <Clock className="w-5 h-5" />, to: `/${tenantSlug}/bookings` },
    { label: 'Punti', icon: <Star className="w-5 h-5" />, to: `/${tenantSlug}/loyalty` },
    { label: 'Profilo', icon: <User className="w-5 h-5" />, to: `/${tenantSlug}/profile` },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 max-w-md mx-auto relative">
      {/* Header */}
      <header
        className="h-14 flex items-center justify-center px-4 shadow-sm"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        {tenant?.logo_url ? (
          <img src={tenant.logo_url} alt={tenant.business_name} className="h-8 object-contain" />
        ) : (
          <h1 className="text-white font-bold text-lg">{tenant?.business_name ?? ''}</h1>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-30"
        aria-label="Navigazione app"
      >
        <ul className="flex" role="list">
          {navItems.map(item => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex flex-col items-center py-2 gap-0.5 text-xs font-medium
                  transition-colors
                  ${isActive ? 'text-[var(--color-primary)]' : 'text-gray-500 hover:text-gray-700'}
                `}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <ToastContainer />
    </div>
  )
}
