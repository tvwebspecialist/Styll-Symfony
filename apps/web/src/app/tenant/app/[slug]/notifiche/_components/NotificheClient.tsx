'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CalendarCheck, Calendar, Clock, Tag, MessageSquare, X, ChevronRight } from 'lucide-react'
import type { ClientNotification } from '@/lib/actions/client-notifications'
import {
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/actions/client-notifications'
import { FloatingCard } from '@/components/pwa/FloatingCard'

interface Props {
  notifications: ClientNotification[]
  tenantId: string
}

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>

const TYPE_ICONS: Record<string, IconComponent> = {
  booking_confirmed:   CalendarCheck,
  reminder_3d:         Calendar,
  reminder_1d:         Calendar,
  reminder_day:        Clock,
  promotion_published: Tag,
  campaign:            MessageSquare,
}

function NotifIconBadge({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type] ?? Bell
  return (
    <div style={{
      width: 44,
      height: 44,
      borderRadius: '50%',
      background: 'color-mix(in srgb, var(--brand-primary) 14%, transparent)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={20} color="var(--brand-primary)" strokeWidth={1.75} />
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

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Rome',
  })
}

export function NotificheClient({ notifications: initial, tenantId }: Props) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [, startTransition] = useTransition()
  const [selectedNotif, setSelectedNotif] = useState<ClientNotification | null>(null)
  const [popupVisible, setPopupVisible] = useState(false)

  const hasUnread = items.some(n => !n.is_read)

  function handleMarkAll() {
    setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    startTransition(async () => {
      await markAllNotificationsRead(tenantId)
    })
  }

  const handleMarkAllRef = useRef(handleMarkAll)
  handleMarkAllRef.current = handleMarkAll

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('notifiche:unread-change', { detail: hasUnread }))
  }, [hasUnread])

  useEffect(() => {
    const handler = () => handleMarkAllRef.current()
    window.addEventListener('notifiche:mark-all', handler)
    return () => window.removeEventListener('notifiche:mark-all', handler)
  }, [])

  // Drive popup slide-in animation: rAF ensures initial translateY renders before transition
  useEffect(() => {
    if (!selectedNotif) { setPopupVisible(false); return }
    const id = requestAnimationFrame(() => setPopupVisible(true))
    return () => cancelAnimationFrame(id)
  }, [selectedNotif])

  function openPopup(notif: ClientNotification) {
    if (!notif.is_read) {
      setItems(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
      startTransition(async () => {
        await markNotificationRead(notif.id)
      })
    }
    setSelectedNotif(notif)
  }

  function closePopup() {
    setPopupVisible(false)
    setTimeout(() => setSelectedNotif(null), 300)
  }

  function handlePopupNavigate(url: string) {
    closePopup()
    setTimeout(() => router.push(url), 150)
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '80px 16px 40px', textAlign: 'center' }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'color-mix(in srgb, var(--brand-primary) 12%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}>
          <Bell size={32} color="var(--brand-primary)" />
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

  const popupUrl = typeof (selectedNotif?.meta as Record<string, unknown> | null)?.url === 'string'
    ? (selectedNotif?.meta as Record<string, string>).url
    : null

  return (
    <>
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(notif => (
          <button
            key={notif.id}
            type="button"
            onClick={() => openPopup(notif)}
            className="pwa-pressable"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: notif.is_read ? '#FAFAFA' : 'color-mix(in srgb, var(--brand-primary) 8%, transparent)',
              borderRadius: 20,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: notif.is_read ? '#F0F0F0' : 'color-mix(in srgb, var(--brand-primary) 30%, transparent)',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <NotifIconBadge type={notif.type} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 14,
                fontWeight: notif.is_read ? 500 : 700,
                color: '#18181B',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                marginBottom: notif.body ? 3 : 0,
              }}>
                {notif.title}
              </p>
              {notif.body && (
                <p style={{
                  margin: 0,
                  fontSize: 13,
                  color: '#52525B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {notif.body}
                </p>
              )}
            </div>

            {!notif.is_read && (
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-primary)', flexShrink: 0 }} />
            )}
          </button>
        ))}
      </div>

      {selectedNotif && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: popupVisible ? 1 : 0,
              transition: 'opacity 290ms ease',
            }}
            onClick={closePopup}
          />

          <FloatingCard
            style={{
              position: 'relative',
              zIndex: 1,
              margin: 12,
              width: 'calc(100% - 24px)',
              maxHeight: '85dvh',
              overflowY: 'auto',
              transform: popupVisible ? 'translateY(0)' : 'translateY(110%)',
              transition: 'transform 290ms cubic-bezier(0.32, 0.72, 0, 1)',
              padding: 0,
            }}
          >
            {/* Handle bar */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12, marginBottom: 4 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#e5e7eb' }} />
            </div>

            <div style={{ padding: 20, paddingBottom: 32 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
                <NotifIconBadge type={selectedNotif.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#18181B', lineHeight: 1.3 }}>
                    {selectedNotif.title}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#A1A1AA', fontWeight: 500 }}>
                    {formatFullDate(selectedNotif.created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePopup}
                  aria-label="Chiudi"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#F4F4F5',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  <X size={16} color="#71717A" />
                </button>
              </div>

              {selectedNotif.body && (
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#52525B', lineHeight: 1.55 }}>
                  {selectedNotif.body}
                </p>
              )}

              {popupUrl && (
                <button
                  type="button"
                  className="pwa-pressable"
                  onClick={() => handlePopupNavigate(popupUrl)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    width: '100%',
                    height: 48,
                    borderRadius: 14,
                    background: 'var(--brand-primary)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Apri
                  <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
                </button>
              )}
            </div>
          </FloatingCard>
        </div>
      )}
    </>
  )
}
