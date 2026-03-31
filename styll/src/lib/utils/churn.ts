import type { ChurnStatus } from '../../types/clients'

export const getChurnStatus = (
  daysSinceLastVisit: number | null,
  avgDaysBetweenVisits: number | null
): ChurnStatus => {
  if (daysSinceLastVisit === null || avgDaysBetweenVisits === null || avgDaysBetweenVisits === 0) {
    return 'green'
  }
  
  if (daysSinceLastVisit <= avgDaysBetweenVisits) return 'green'
  if (daysSinceLastVisit <= avgDaysBetweenVisits * 1.5) return 'yellow'
  return 'red'
}

export const getChurnLabel = (status: ChurnStatus): string => {
  switch (status) {
    case 'green': return 'Regolare'
    case 'yellow': return 'A rischio'
    case 'red': return 'In fuga'
  }
}

export const getChurnEmoji = (status: ChurnStatus): string => {
  switch (status) {
    case 'green': return '🟢'
    case 'yellow': return '🟡'
    case 'red': return '🔴'
  }
}

export const getChurnColor = (status: ChurnStatus): string => {
  switch (status) {
    case 'green': return '#22C55E'
    case 'yellow': return '#EAB308'
    case 'red': return '#EF4444'
  }
}

export const getChurnMessage = (
  clientName: string,
  daysSince: number | null,
  avgDays: number | null
): string => {
  if (!daysSince || !avgDays) return ''
  
  if (daysSince > avgDays * 1.5) {
    return `${clientName} non viene da ${daysSince} giorni (media: ${Math.round(avgDays)} giorni)`
  }
  if (daysSince > avgDays) {
    return `${clientName} è in ritardo di ${daysSince - Math.round(avgDays)} giorni rispetto alla sua frequenza`
  }
  return ''
}
