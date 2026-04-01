import React from 'react'
import { Menu, Bell } from 'lucide-react'
import { useUIContext } from '../../contexts/UIContext'
import { useMessages } from '../../hooks/useMessages'
import { Badge } from '../ui'

interface HeaderProps {
  title?: string
  actions?: React.ReactNode
}

export const Header: React.FC<HeaderProps> = ({ title, actions }) => {
  const { setSidebarOpen } = useUIContext()
  const { unreadCount } = useMessages()

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-4">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 lg:hidden"
        aria-label="Apri menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Title */}
      {title && (
        <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">{title}</h1>
      )}

      <div className="flex-1" />

      {/* Actions */}
      {actions && <div>{actions}</div>}

      {/* Notifications */}
      <button
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        aria-label={`Notifiche${unreadCount > 0 ? ` (${unreadCount} non lette)` : ''}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </header>
  )
}
