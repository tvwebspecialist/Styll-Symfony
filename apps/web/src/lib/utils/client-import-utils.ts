/** Pure utility helpers for CSV client import — no server dependency. */

export function normalizePhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-\.\(\)]/g, '').trim()
  if (!cleaned) return null
  if (/^\+\d{8,15}$/.test(cleaned)) return cleaned
  if (/^00\d{8,15}$/.test(cleaned)) return '+' + cleaned.slice(2)
  if (/^\d{9,11}$/.test(cleaned)) return '+39' + cleaned.replace(/^39/, '')
  return null
}

export function normalizeEmail(raw: string): string | null {
  const t = raw.trim().toLowerCase()
  if (!t) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t
}

export function parseDateOfBirth(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const m = t.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export function parseBooleanField(raw: string): boolean {
  const t = raw.trim().toLowerCase()
  return ['1', 'true', 'yes', 'y', 'si', 'sì', 'vero'].includes(t)
}

export function parseCsvTags(raw: string): string[] {
  if (!raw) return []
  return raw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean).slice(0, 20)
}
