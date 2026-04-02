import React from 'react'
import { useMessages } from '../../hooks/useMessages'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { formatRelative } from '../../lib/utils/date'
import { Bell, BellOff } from 'lucide-react'

const Messages: React.FC = () => {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } = useMessages()

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Notifiche</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-gray-500">{unreadCount} non lette</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button size="sm" variant="outline" onClick={markAllAsRead}>
            Segna tutte come lette
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<BellOff className="w-12 h-12" />}
          title="Nessuna notifica"
          message="Le tue notifiche appariranno qui"
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(notif => (
            <Card
              key={notif.id}
              hoverable
              onClick={() => !notif.is_read && markAsRead(notif.id)}
              className={!notif.is_read ? 'border-[var(--color-primary)] bg-blue-50/30' : ''}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Bell className={`w-4 h-4 ${!notif.is_read ? 'text-[var(--color-primary)]' : 'text-gray-400'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                      {notif.title}
                    </p>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {formatRelative(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{notif.body}</p>
                </div>
                {!notif.is_read && (
                  <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] mt-1.5 flex-shrink-0" />
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Messages
