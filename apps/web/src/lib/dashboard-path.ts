function dashboardPathParts(pathname: string): string[] {
  return pathname.split('/').filter(Boolean)
}

export function isDashboardHomePath(pathname: string): boolean {
  const parts = dashboardPathParts(pathname)

  if (parts.length === 0) return true

  return parts.length === 3 && parts[0] === 'tenant' && parts[1] === 'dashboard'
}

export function getDashboardSection(pathname: string): string | null {
  const parts = dashboardPathParts(pathname)

  if (parts[0] === 'tenant' && parts[1] === 'dashboard') {
    return parts[3] ?? null
  }

  return parts[0] ?? null
}

const DETAIL_TITLES: Record<string, string> = {
  clienti: 'Cliente',
  appuntamenti: 'Appuntamento',
  prodotti: 'Prodotto',
  team: 'Staff',
  vendite: 'Vendita',
}

// Known static sub-paths that are NOT dynamic detail pages
const STATIC_SUBPATHS = new Set(['import-help', 'aiuto', 'new', 'add'])

export function getDashboardDetailTitle(pathname: string): string | null {
  const parts = dashboardPathParts(pathname)
  let section: string
  let subsection: string | undefined

  if (parts[0] === 'tenant' && parts[1] === 'dashboard') {
    section = parts[3] ?? ''
    subsection = parts[4]
  } else {
    section = parts[0] ?? ''
    subsection = parts[1]
  }

  if (!subsection || STATIC_SUBPATHS.has(subsection)) return null
  return DETAIL_TITLES[section] ?? null
}
