export function buildTenantAppPath(slug: string, relativePath: string = ''): string {
  const normalizedPath = !relativePath
    ? ''
    : relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`

  return `/tenant/app/${slug}${normalizedPath}`
}

export function randomEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
}
