// Pure utilities for the inbox UI — no React, no server, no imports.
// Imported by InboxConversazioni.tsx AND by unit tests.

export function formatTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  }
  const daysDiff = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (daysDiff === 1) return 'Ieri'
  if (daysDiff < 7) return d.toLocaleDateString('it-IT', { weekday: 'short' })
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
}

export function formatMsgTime(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
}

export function getInitials(name: string | null, phone: string | null): string {
  const trimmed = name?.trim() ?? ''
  if (trimmed.length > 0) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return ((parts[0][0] ?? '') + (parts[1][0] ?? '')).toUpperCase()
    return (parts[0] ?? '').slice(0, 2).toUpperCase() || '?'
  }
  if (phone) return phone.slice(-2)
  return '?'
}

// Models the cancellable async load used in InboxConversazioni for message fetching.
// Returns a cancel function; when called, any in-flight resolution is silently discarded.
// Callers must also call setItems([]) before starting a new load to avoid stale display.
export function makeCancellableLoad<T>(
  fetch: () => Promise<T>,
  onSuccess: (data: T) => void,
  onError: (err: unknown) => void,
): () => void {
  let cancelled = false
  fetch()
    .then((data) => { if (!cancelled) onSuccess(data) })
    .catch((err) => { if (!cancelled) onError(err) })
  return () => { cancelled = true }
}

// Trigger logic mirrored from handle_inbox_message_insert (migration 20260717093000).
// Used in tests to verify trigger behaviour without a live DB.
export function triggerPreviewText(bodyText: string | null): string {
  const trimmed = (bodyText ?? '').trim()
  return (trimmed.length > 0 ? trimmed : '[media]').slice(0, 240)
}

export function triggerIncrementsUnread(direction: string, authorKind: string): boolean {
  return direction === 'inbound' && authorKind === 'customer'
}
