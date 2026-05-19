/**
 * Converts a local date+time string to a proper UTC Date.
 * Fixes the classic "new Date('2024-06-15T09:00:00')" bug where the
 * string is interpreted as UTC on servers, adding +offset hours.
 *
 * Example: '2024-06-15', '09:00', 'Europe/Rome' (UTC+2) → 07:00 UTC ✅
 */
export function localDatetimeToUtc(
  date: string,
  time: string,
  timezone: string = 'Europe/Rome'
): Date {
  // Treat input as UTC to get a reference instant
  const naiveUtc = new Date(`${date}T${time}:00Z`)

  // Find what clock time the timezone would show for that instant
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(naiveUtc)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'

  // Re-express that local clock time as if it were UTC
  const inTzAsUtc = new Date(
    `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`
  )

  // The difference is the timezone offset; subtract it to get the real UTC instant
  const offsetMs = inTzAsUtc.getTime() - naiveUtc.getTime()
  return new Date(naiveUtc.getTime() - offsetMs)
}

/**
 * Formats a UTC ISO string as HH:MM in the given timezone.
 * Use this instead of new Date(iso).getHours() to avoid browser/server TZ differences.
 */
export function formatTimeInTimezone(
  iso: string,
  timezone: string = 'Europe/Rome'
): string {
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

/**
 * Returns the total minutes from midnight (in the given timezone) for a UTC ISO string.
 * Use this for pixel-positioning appointment blocks in the calendar grid.
 */
export function getLocalMinutes(
  iso: string,
  timezone: string = 'Europe/Rome'
): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(new Date(iso))
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return h * 60 + m
}
