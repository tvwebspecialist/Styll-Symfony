import { format, formatDistance, parseISO, isToday, isTomorrow, isYesterday, differenceInDays } from 'date-fns'
import { it } from 'date-fns/locale'

export const formatDate = (date: string | Date, pattern = 'dd/MM/yyyy'): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: it })
}

export const formatDateTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'dd/MM/yyyy HH:mm', { locale: it })
}

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm', { locale: it })
}

export const formatRelative = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Oggi'
  if (isTomorrow(d)) return 'Domani'
  if (isYesterday(d)) return 'Ieri'
  return formatDistance(d, new Date(), { addSuffix: true, locale: it })
}

export const formatDayLabel = (date: string | Date): string => {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Oggi'
  if (isTomorrow(d)) return 'Domani'
  return format(d, 'EEEE d MMMM', { locale: it })
}

export const getDaysSince = (date: string | null): number | null => {
  if (!date) return null
  return differenceInDays(new Date(), parseISO(date))
}

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export const toISOString = (date: Date): string => date.toISOString()

export const todayStart = (): Date => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export const todayEnd = (): Date => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export const getWeekDates = (date: Date = new Date()): Date[] => {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Adjust for Monday start
  start.setDate(diff)
  start.setHours(0, 0, 0, 0)
  
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })
}

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}min`
}
