'use client'

import * as React from 'react'
import {
  Calendar,
  X as XIcon,
  UserPlus,
  ArrowRightLeft,
  CreditCard,
  Settings,
  CheckCheck,
  BellOff,
  type LucideIcon,
} from 'lucide-react'
import { markNotificationRead, markAllNotificationsRead } from '@/lib/actions/notifiche'
import type { NotifRow } from '@/lib/actions/notifiche'

// ─── Types ────────────────────────────────────────────────────────────────────

type UiType = 'appointment' | 'cancellation' | 'new_client' | 'reschedule' | 'payment' | 'system'
type TabFilter = 'all' | 'unread' | 'appointments' | 'system'

interface Notif {
  id: string
  uiType: UiType
  title: string
  subtitle: string
  time: string
  read: boolean
  meta: Record<string, unknown>
}

interface NotificheClientProps {
  initialNotifications: NotifRow[]
  tenantId: string
}

function toUiType(dbType: string): UiType {
  switch (dbType) {
    case 'new_booking':  return 'appointment'
    case 'cancellation': return 'cancellation'
    case 'reschedule':   return 'reschedule'
    case 'new_client':   return 'new_client'
    case 'payment':      return 'payment'
    default:             return 'system'
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min  = Math.floor(diff / 60_000)
  if (min < 1)  return 'Ora'
  if (min < 60) return `${min} min fa`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h} or${h === 1 ? 'a' : 'e'} fa`
  const d = Math.floor(h / 24)
  if (d === 1)  return 'Ieri'
  if (d < 7)    return `${d} giorni fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function mapRow(row: NotifRow): Notif {
  return {
    id:       row.id,
    uiType:   toUiType(row.type),
    title:    row.title,
    subtitle: row.body ?? '',
    time:     relativeTime(row.created_at),
    read:     row.is_read,
    meta:     (row.meta ?? {}) as Record<string, unknown>,
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<UiType, { icon: LucideIcon; bg: string; color: string }> = {
  appointment:  { icon: Calendar,       bg: '#E8F0FE', color: '#4285F4' },
  cancellation: { icon: XIcon,          bg: '#FDE8E8', color: '#E53935' },
  reschedule:   { icon: ArrowRightLeft, bg: '#FFF3E8', color: '#F57C00' },
  new_client:   { icon: UserPlus,       bg: '#E8F5E9', color: '#43A047' },
  payment:      { icon: CreditCard,     bg: '#FFF8E1', color: '#F9A825' },
  system:       { icon: Settings,       bg: '#F3E8FE', color: '#8E24AA' },
}


const TABS: { id: TabFilter; label: string }[] = [
  { id: 'all',          label: 'Tutte'          },
  { id: 'unread',       label: 'Non lette'      },
  { id: 'appointments', label: 'Appuntamenti'   },
  { id: 'system',       label: 'Sistema'        },
]

function filterNotifs(notifs: Notif[], tab: TabFilter): Notif[] {
  switch (tab) {
    case 'unread':       return notifs.filter((n) => !n.read)
    case 'appointments': return notifs.filter((n) => ['appointment', 'cancellation', 'reschedule'].includes(n.uiType))
    case 'system':       return notifs.filter((n) => ['system', 'payment', 'new_client'].includes(n.uiType))
    default:             return notifs
  }
}

// ─── Notification Card (pill) ─────────────────────────────────────────────────

function NotifCard({ notif, onMarkRead }: { notif: Notif; onMarkRead: (id: string) => void }) {
  const config = TYPE_CONFIG[notif.uiType]
  const Icon = config.icon
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !notif.read && onMarkRead(notif.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 20px',
        borderRadius: 999,
        background: notif.read ? '#FFFFFF' : '#F9FAFF',
        boxShadow: hovered
          ? '0 6px 28px rgba(0,0,0,0.11)'
          : notif.read
            ? '0 2px 14px rgba(0,0,0,0.05)'
            : '0 4px 20px rgba(0,0,0,0.08)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 240ms ease, transform 240ms ease',
        cursor: notif.read ? 'default' : 'pointer',
      }}
    >
      {/* Colored icon badge */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: config.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={config.color} />
        </div>
        {/* Unread dot on icon */}
        {!notif.read && (
          <div
            style={{
              position: 'absolute',
              top: 1,
              right: 1,
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#222222',
              border: '2px solid #F9FAFF',
            }}
          />
        )}
      </div>

      {/* Title + subtitle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 15,
            fontWeight: notif.read ? 600 : 700,
            color: notif.read ? '#374151' : '#111827',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {notif.title}
        </p>
        <p
          style={{
            fontSize: 13,
            color: '#6B7280',
            margin: '3px 0 0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notif.subtitle}
        </p>
      </div>

      {/* Timestamp */}
      <span
        style={{
          fontSize: 12,
          color: '#9CA3AF',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {notif.time}
      </span>
    </div>
  )
}

// ─── NotificheClient ──────────────────────────────────────────────────────────

export function NotificheClient({ initialNotifications, tenantId }: NotificheClientProps) {
  const [notifications, setNotifications] = React.useState<Notif[]>(() => initialNotifications.map(mapRow))
  const [activeTab, setActiveTab] = React.useState<TabFilter>('all')

  const unreadCount = notifications.filter((n) => !n.read).length
  const filtered = filterNotifs(notifications, activeTab)

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    markNotificationRead(tenantId, id).catch((err) => console.error('[notifiche] markRead failed:', err))
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    markAllNotificationsRead(tenantId).catch((err) => console.error('[notifiche] markAllRead failed:', err))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1
              className="dashboard-page-title"
              style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}
            >
              Notifiche
            </h1>
            {unreadCount > 0 && (
              <span
                style={{
                  background: '#222222',
                  color: '#FFFFFF',
                  fontSize: 12,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '3px 9px',
                  lineHeight: 1.4,
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
            {unreadCount > 0
              ? `Hai ${unreadCount} notific${unreadCount === 1 ? 'a' : 'he'} non lett${unreadCount === 1 ? 'a' : 'e'}`
              : 'Sei aggiornato su tutto!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="styll-btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '11px 18px',
              fontSize: 14,
              minHeight: 44,
              borderRadius: 999,
            }}
          >
            <CheckCheck size={16} />
            Segna tutte come lette
          </button>
        )}
      </div>

      {/* ── Tab filters ── */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          overflowX: 'auto',
          padding: '2px 0',
          scrollbarWidth: 'none',
        }}
      >
        {TABS.map((tab) => {
          const count =
            tab.id === 'all'
              ? notifications.length
              : filterNotifs(notifications, tab.id).length

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '9px 18px',
                borderRadius: 999,
                border: activeTab === tab.id ? '1px solid #1A1A1A' : '1px solid #E9E9E9',
                background: activeTab === tab.id ? '#1A1A1A' : '#FFFFFF',
                color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-fg-secondary)',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background 150ms ease, color 150ms ease',
                minHeight: 40,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {tab.label}
              {count > 0 && (
                <span
                  style={{
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.18)' : '#F3F4F6',
                    color: activeTab === tab.id ? '#FFFFFF' : '#6B7280',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 999,
                    padding: '1px 6px',
                    lineHeight: 1.5,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Notification list ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BellOff size={26} color="var(--color-fg-muted)" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-fg)', margin: 0 }}>
            Nessuna notifica
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: 0 }}>
            {activeTab === 'unread'
              ? 'Sei aggiornato su tutto!'
              : 'Non ci sono notifiche in questa categoria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((notif) => (
            <NotifCard key={notif.id} notif={notif} onMarkRead={markRead} />
          ))}
        </div>
      )}
    </div>
  )
}

