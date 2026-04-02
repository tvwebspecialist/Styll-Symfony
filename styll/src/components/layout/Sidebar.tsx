import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Calendar, Users, Scissors, Package, Star, MessageSquare,
  BarChart2, Settings, ChevronLeft, ChevronRight, Home,
  UserCheck, Megaphone, LogOut, Bell
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useTenant } from '../../hooks/useTenant'
import { useMessages } from '../../hooks/useMessages'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'

interface NavItem {
  label: string
  icon: React.ReactNode
  to: string
  roles?: string[]
  badge?: number
}

export const Sidebar: React.FC = () => {
  const { profile, role, signOut } = useAuth()
  const { tenant } = useTenant()
  const { unreadCount } = useMessages()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const navItems: NavItem[] = [
    { label: 'Home', icon: <Home className="w-5 h-5" />, to: '/dashboard/home' },
    { label: 'Calendario', icon: <Calendar className="w-5 h-5" />, to: '/dashboard/calendar' },
    { label: 'Clienti', icon: <Users className="w-5 h-5" />, to: '/dashboard/clients' },
    { label: 'Servizi', icon: <Scissors className="w-5 h-5" />, to: '/dashboard/services', roles: ['owner', 'manager'] },
    { label: 'Prodotti', icon: <Package className="w-5 h-5" />, to: '/dashboard/products', roles: ['owner', 'manager'] },
    { label: 'Loyalty', icon: <Star className="w-5 h-5" />, to: '/dashboard/loyalty', roles: ['owner', 'manager'] },
    { label: 'Messaggi', icon: <MessageSquare className="w-5 h-5" />, to: '/dashboard/messages', badge: unreadCount },
    { label: 'Analytics', icon: <BarChart2 className="w-5 h-5" />, to: '/dashboard/analytics', roles: ['owner', 'manager'] },
    { label: 'Team', icon: <UserCheck className="w-5 h-5" />, to: '/dashboard/staff', roles: ['owner', 'manager'] },
    { label: 'Promozione', icon: <Megaphone className="w-5 h-5" />, to: '/dashboard/promote', roles: ['owner'] },
    { label: 'Impostazioni', icon: <Settings className="w-5 h-5" />, to: '/dashboard/settings', roles: ['owner'] },
  ]

  const visibleItems = navItems.filter(item =>
    !item.roles || (role && item.roles.includes(role))
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth/login')
  }

  return (
    <aside
      className={`
        flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
      aria-label="Navigazione principale"
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 gap-3">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {tenant?.business_name ?? 'Styll'}
            </p>
            <p className="text-xs text-gray-500">Dashboard</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0"
          aria-label={collapsed ? 'Espandi sidebar' : 'Comprimi sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 py-4 overflow-y-auto" aria-label="Menu principale">
        <ul className="space-y-1 px-2" role="list">
          {visibleItems.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors duration-150 group
                  ${isActive
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0 relative">
                  {item.icon}
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User profile */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <Avatar
            name={profile?.full_name ?? 'Utente'}
            src={profile?.avatar_url}
            size="sm"
          />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name ?? 'Utente'}
              </p>
              <p className="text-xs text-gray-500 capitalize">{role ?? 'staff'}</p>
            </div>
          )}
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            aria-label="Esci"
            title="Esci"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
