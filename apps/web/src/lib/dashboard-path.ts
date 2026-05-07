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
