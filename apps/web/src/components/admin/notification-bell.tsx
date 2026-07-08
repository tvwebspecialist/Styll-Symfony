'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  Building2,
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  getPlatformNotifications,
  markPlatformNotificationRead,
  markAllPlatformNotificationsRead,
  type PlatformNotifRow,
} from '@/lib/actions/platform-notifiche'

// ─── Helpers ──────────────────────────────────────────────────
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Ora'
  if (min < 60) return `${min} min fa`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} or${h === 1 ? 'a' : 'e'} fa`
  const d = Math.floor(h / 24)
  if (d === 1) return 'Ieri'
  if (d < 7) return `${d} giorni fa`
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function typeIcon(type: string): { Icon: typeof Building2; color: string; bg: string } {
  switch (type) {
    case 'tenant_created':
      return { Icon: Building2, color: '#16a34a', bg: '#16a34a18' }
    case 'tenant_suspended':
      return { Icon: AlertTriangle, color: '#dc2626', bg: '#dc262618' }
    case 'tenant_reactivated':
      return { Icon: CheckCircle2, color: '#16a34a', bg: '#16a34a18' }
    case 'user_registered_staff':
      return { Icon: UserPlus, color: '#6366f1', bg: '#6366f118' }
    default:
      return { Icon: Bell, color: '#71717a', bg: '#71717a18' }
  }
}

// ─── Component ────────────────────────────────────────────────
interface Props {
  initialUnreadCount?: number
}

export function NotificationBell({ initialUnreadCount = 0 }: Props) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [unreadCount, setUnreadCount] = React.useState(initialUnreadCount)
  const [notifications, setNotifications] = React.useState<PlatformNotifRow[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [pending, startTransition] = React.useTransition()
  const ref = React.useRef<HTMLDivElement>(null)

  // ── Realtime subscription ─────────────────────────────────
  React.useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('platform-notif-badge')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'platform_notifications' },
        (payload) => {
          const row = payload.new as PlatformNotifRow
          if (!row.is_read) {
            setUnreadCount((c) => c + 1)
            setNotifications((prev) =>
              prev ? [row, ...prev].slice(0, 20) : null
            )
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'platform_notifications' },
        (payload) => {
          const oldRow = payload.old as Partial<PlatformNotifRow>
          const newRow = payload.new as PlatformNotifRow
          if (oldRow.is_read === false && newRow.is_read === true) {
            setUnreadCount((c) => Math.max(0, c - 1))
          }
          setNotifications((prev) =>
            prev ? prev.map((n) => (n.id === newRow.id ? newRow : n)) : null
          )
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  // ── Load list on first open ───────────────────────────────
  React.useEffect(() => {
    if (!open || notifications !== null) return
    setLoading(true)
    getPlatformNotifications()
      .then((data) => setNotifications(data))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false))
  }, [open, notifications])

  // ── Close on outside click ────────────────────────────────
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

  // ── Actions ───────────────────────────────────────────────
  function handleOpen() {
    setOpen((o) => !o)
  }

  function handleClickNotif(n: PlatformNotifRow) {
    if (!n.is_read) {
      startTransition(async () => {
        await markPlatformNotificationRead(n.id)
        setNotifications((prev) =>
          prev ? prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)) : null
        )
        setUnreadCount((c) => Math.max(0, c - 1))
      })
    }
    if (n.tenant_id) {
      setOpen(false)
      router.push(`/admin/tenants/${n.tenant_id}`)
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllPlatformNotificationsRead()
      setNotifications((prev) => prev?.map((n) => ({ ...n, is_read: true })) ?? null)
      setUnreadCount(0)
    })
  }

  // ── Shared list renderer ──────────────────────────────────
  function renderList() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10">
          <span className="text-xs" style={{ color: 'var(--admin-text-subtle)' }}>
            Caricamento…
          </span>
        </div>
      )
    }
    if (!notifications || notifications.length === 0) {
      return (
        <div className="flex flex-col items-center gap-2 py-10">
          <Bell size={28} style={{ color: 'var(--admin-text-subtle)' }} />
          <p className="text-sm" style={{ color: 'var(--admin-text-subtle)' }}>
            Nessuna notifica
          </p>
        </div>
      )
    }
    return notifications.map((n) => {
      const { Icon, color, bg } = typeIcon(n.type)
      return (
        <button
          key={n.id}
          type="button"
          onClick={() => handleClickNotif(n)}
          disabled={pending}
          className="group relative flex w-full gap-3 border-b px-4 py-3 text-left transition-colors last:border-0 styll-hover-admin-hover-bg disabled:opacity-60"
          style={{
            borderColor: 'var(--admin-border)',
            background: n.is_read ? 'transparent' : 'var(--admin-accent-subtle)',
          }}
        >
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ background: bg }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium leading-tight"
              style={{ color: 'var(--admin-text)' }}
            >
              {n.title}
            </p>
            {n.body && (
              <p
                className="mt-0.5 text-xs leading-relaxed"
                style={{ color: 'var(--admin-text-muted)' }}
              >
                {n.body}
              </p>
            )}
            <p className="mt-1 text-[10px]" style={{ color: 'var(--admin-text-subtle)' }}>
              {relativeTime(n.created_at)}
            </p>
          </div>
          {!n.is_read && (
            <span
              className="mt-2 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: 'var(--admin-accent)' }}
            />
          )}
        </button>
      )
    })
  }

  // ── Header for dropdown/sheet ─────────────────────────────
  function renderHeader() {
    return (
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: 'var(--admin-border)' }}
      >
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--admin-text)' }}
        >
          Notifiche
        </span>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={pending}
            className="text-xs font-medium hover:underline disabled:opacity-50"
            style={{ color: 'var(--admin-accent)' }}
          >
            Segna tutte come lette
          </button>
        )}
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      {/* ── Bell button ───────────────────────────────────── */}
      <button
        type="button"
        onClick={handleOpen}
        className="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors styll-hover-admin-hover-bg"
        aria-label="Notifiche piattaforma"
      >
        <Bell size={18} style={{ color: 'var(--admin-text-muted)' }} />
        {unreadCount > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full styll-bg-admin-accent text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* ── Desktop dropdown ──────────────────────────────── */}
      {open && (
        <div
          className="absolute right-0 top-10 z-50 hidden w-80 flex-col overflow-hidden rounded-[var(--radius-lg)] border shadow-[var(--shadow-lg)] md:flex"
          style={{
            background: 'var(--admin-surface)',
            borderColor: 'var(--admin-border)',
          }}
        >
          {renderHeader()}
          <div className="max-h-[360px] overflow-y-auto [scrollbar-width:none]">
            {renderList()}
          </div>
        </div>
      )}

      {/* ── Mobile bottom sheet ───────────────────────────── */}
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
            {/* Close on drag handle area */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full styll-hover-admin-hover-bg"
              aria-label="Chiudi"
            >
              <X size={14} style={{ color: 'var(--admin-text-muted)' }} />
            </button>
            {renderHeader()}
            <div className="overflow-y-auto [scrollbar-width:none]">
              {renderList()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
