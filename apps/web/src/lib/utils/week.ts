/** Returns the ISO date (YYYY-MM-DD) of the Monday of the week containing dateStr. */
export function getWeekMonday(dateStr?: string | null): string {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}
