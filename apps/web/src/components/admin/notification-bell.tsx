'use client'

import * as React from 'react'
import { Bell, Building2, AlertTriangle, UserPlus, CreditCard, X } from 'lucide-react'

interface Notification {
  id: string
  type: 'new_tenant' | 'trial_expiring' | 'suspended' | 'new_staff'
  title: string
  body: string
  time: string
  read: boolean
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'new_tenant',
    title: 'Nuovo barbiere registrato',
    body: 'Black Blade Barbershop ha completato l\'onboarding.',
    time: '2 ore fa',
    read: false,
  },
  {
    id: '2',
    type: 'trial_expiring',
    title: 'Trial in scadenza',
    body: 'Barber Club Roma · trial scade tra 3 giorni.',
    time: '5 ore fa',
    read: false,
  },
  {
    id: '3',
    type: 'suspended',
    title: 'Tenant sospeso',
    body: 'Il pagamento di Fade Factory è fallito. Account sospeso.',
    time: 'ieri',
    read: true,
  },
  {
    id: '4',
    type: 'new_staff',
    title: 'Nuovo staff aggiunto',
    body: 'Marco B. è stato aggiunto come barber in Steel & Blade.',
    time: '2 giorni fa',
    read: true,
  },
]

function notifIcon(type: Notification['type']) {
  switch (type) {
    case 'new_tenant': return Building2
    case 'trial_expiring': return CreditCard
    case 'suspended': return AlertTriangle
    case 'new_staff': return UserPlus
  }
}

function notifIconColor(type: Notification['type']): string {
  switch (type) {
    case 'new_tenant': return '#16a34a'
    case 'trial_expiring': return '#d97706'
    case 'suspended': return '#dc2626'
    case 'new_staff': return '#6366f1'
  }
}

export function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<Notification[]>(MOCK_NOTIFICATIONS)
  const ref = React.useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  function dismiss(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  // Close on outside click
  React.useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-[var(--admin-hover-bg)]"
        aria-label="Notifiche"
      >
        <Bell size={18} style={{ color: 'var(--admin-text-muted)' }} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--admin-accent)] text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 hidden w-80 flex-col overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)] md:flex"
          style={{
            background: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--admin-border)' }}
          >
            <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
              Notifiche
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs font-medium hover:underline"
                style={{ color: 'var(--admin-accent)' }}
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto [scrollbar-width:none]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell size={28} style={{ color: 'var(--admin-text-subtle)' }} />
                <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
                  Nessuna notifica
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = notifIcon(n.type)
                const iconColor = notifIconColor(n.type)
                return (
                  <div
                    key={n.id}
                    className="group relative flex gap-3 border-b px-4 py-3 transition-colors last:border-0"
                    style={{
                      borderColor: 'var(--admin-border)',
                      background: n.read ? 'transparent' : 'var(--admin-accent-subtle)',
                    }}
                  >
                    <div
                      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `${iconColor}15` }}
                    >
                      <Icon size={14} style={{ color: iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight" style={{ color: 'var(--admin-text)' }}>
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px]" style={{ color: 'var(--admin-text-subtle)' }}>
                        {n.time}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(n.id)}
                      className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--admin-hover-bg)] group-hover:flex"
                      aria-label="Rimuovi"
                    >
                      <X size={11} style={{ color: 'var(--admin-text-subtle)' }} />
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative flex flex-col overflow-hidden"
            style={{
              background: 'var(--admin-surface)',
              borderRadius: '20px 20px 0 0',
              maxHeight: '70vh',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            }}
          >
            {/* Drag handle */}
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-black/10" />

            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--admin-border)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                Notifiche
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-xs font-medium"
                  style={{ color: 'var(--admin-accent)' }}
                >
                  Segna tutte come lette
                </button>
              )}
            </div>

            <div className="overflow-y-auto [scrollbar-width:none]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10">
                  <Bell size={28} style={{ color: 'var(--admin-text-subtle)' }} />
                  <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
                    Nessuna notifica
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = notifIcon(n.type)
                  const iconColor = notifIconColor(n.type)
                  return (
                    <div
                      key={n.id}
                      className="flex gap-3 border-b px-4 py-3 last:border-0"
                      style={{
                        borderColor: 'var(--admin-border)',
                        background: n.read ? 'transparent' : 'var(--admin-accent-subtle)',
                      }}
                    >
                      <div
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                        style={{ background: `${iconColor}15` }}
                      >
                        <Icon size={14} style={{ color: iconColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--admin-text)' }}>
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                          {n.body}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--admin-text-subtle)' }}>
                          {n.time}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
