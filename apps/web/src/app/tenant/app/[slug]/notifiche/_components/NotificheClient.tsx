'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarCheck, Calendar, Clock, Tag, MessageSquare } from 'lucide-react'
import type { ClientNotification } from '@/lib/actions/client-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/client-notifications'

interface Props {
  notifications: ClientNotification[]
  tenantId: string
}

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

interface TypeCfg { Icon: IconComponent; color: string }

const TYPE_CONFIG: Record<string, TypeCfg> = {
  booking_confirmed:   { Icon: CalendarCheck, color: '#16a34a' },
  reminder_3d:         { Icon: Calendar,      color: '#f97316' },
  reminder_1d:         { Icon: Calendar,      color: '#f97316' },
  reminder_day:        { Icon: Clock,         color: '#ef4444' },
  promotion_published: { Icon: Tag,           color: '#9333ea' },
  campaign:            { Icon: MessageSquare, color: '#2563eb' },
}
const DEFAULT_CFG: TypeCfg = { Icon: Bell, color: '#71717a' }

function NotifIconBadge({ type }: { type: string }) {
  const { Icon, color } = TYPE_CONFIG[type] ?? DEFAULT_CFG
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: color,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={20} color="#FFFFFF" strokeWidth={1.75} />
    </div>
  )
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (minutes < 60) return `${Math.max(minutes, 1)} min fa`
  if (hours < 24) return `${hours} ${hours === 1 ? 'ora' : 'ore'} fa`
  if (days < 7) return `${days} ${days === 1 ? 'giorno' : 'giorni'} fa`
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })
}

export function NotificheClient({ notifications: initial, tenantId }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [, startTransition] = useTransition()

  const hasUnread = items.some(n => !n.is_read)

  function handleMarkAll() {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllNotificationsRead(tenantId)
    })
  }

  // Ref keeps latest handleMarkAll for use in the event listener without stale closure
  const handleMarkAllRef = useRef(handleMarkAll)
  handleMarkAllRef.current = handleMarkAll

  // Broadcast unread state to PwaTopBar (which renders the "mark all" icon button)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('notifiche:unread-change', { detail: hasUnread }))
  }, [hasUnread])

  // Respond to mark-all trigger from PwaTopBar
  useEffect(() => {
    const handler = () => handleMarkAllRef.current()
    window.addEventListener('notifiche:mark-all', handler)
    return () => window.removeEventListener('notifiche:mark-all', handler)
  }, [])

  function handleTap(notif: ClientNotification) {
    if (!notif.is_read) {
      setItems(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      startTransition(async () => {
        await markNotificationRead(notif.id)
      })
    }
    const url = (notif.meta as Record<string, unknown> | null)?.url
    if (typeof url === 'string') router.push(url)
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '80px 16px 40px', textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: '#F4F4F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Bell size={32} color="#A1A1AA" />
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: '#18181B', margin: '0 0 6px' }}>
          Nessuna notifica
        </p>
        <p style={{ fontSize: 14, color: '#A1A1AA', margin: 0 }}>
          Le conferme di prenotazione, i promemoria e le offerte appariranno qui.
        </p>
      </div>
    )
  }

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(notif => {
        const hasLink = typeof (notif.meta as Record<string, unknown> | null)?.url === 'string'
        return (
          <button
            key={notif.id}
            type="button"
            onClick={() => handleTap(notif)}
            className="pwa-pressable"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              background: notif.is_read ? '#FAFAFA' : '#EFF6FF',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: notif.is_read ? '1.5px solid #F0F0F0' : '1.5px solid #BFDBFE',
              cursor: hasLink ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <NotifIconBadge type={notif.type} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: notif.is_read ? 500 : 700,
                  color: '#18181B',
                  flex: 1,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {notif.title}
                </p>
                {!notif.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                )}
              </div>
              {notif.body && (
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#52525B', lineHeight: 1.45 }}>
                  {notif.body}
                </p>
              )}
              <p style={{ margin: 0, fontSize: 11, color: '#A1A1AA', fontWeight: 500 }}>
                {formatRelative(notif.created_at)}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
