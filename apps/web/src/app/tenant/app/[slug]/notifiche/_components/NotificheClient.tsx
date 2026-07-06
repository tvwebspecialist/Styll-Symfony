'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarCheck, Clock, Tag, CheckCheck } from 'lucide-react'
import type { ClientNotification } from '@/lib/actions/client-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/client-notifications'

interface Props {
  notifications: ClientNotification[]
  tenantId: string
}

function NotifIcon({ type }: { type: string }) {
  if (type === 'booking_confirmed') return <CalendarCheck size={20} color="#22c55e" />
  if (type.startsWith('reminder')) return <Clock size={20} color="#3b82f6" />
  if (type === 'promotion_published') return <Tag size={20} color="#a855f7" />
  return <Bell size={20} color="#6b7280" />
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

  function handleMarkAll() {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllNotificationsRead(tenantId)
    })
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
      {hasUnread && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 2 }}>
          <button
            type="button"
            onClick={handleMarkAll}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              color: '#3b82f6',
              background: 'none',
              border: 'none',
              padding: '4px 2px',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <CheckCheck size={14} />
            Segna tutte come lette
          </button>
        </div>
      )}

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
              background: notif.is_read ? '#FFFFFF' : '#EFF6FF',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              border: notif.is_read ? '1.5px solid #F4F4F5' : '1.5px solid #BFDBFE',
              cursor: hasLink ? 'pointer' : 'default',
              textAlign: 'left',
            }}
          >
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: notif.is_read ? '#F4F4F5' : '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <NotifIcon type={notif.type} />
            </div>

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
