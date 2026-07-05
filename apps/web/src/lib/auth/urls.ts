const ROOT_APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000')
  .trim()
  .replace(/\/$/, '')

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it')
  .trim()
  .replace(/^\./, '')

const PWA_BASE_DOMAIN = (process.env.NEXT_PUBLIC_PWA_BASE_DOMAIN ?? ROOT_DOMAIN)
  .trim()
  .replace(/^\./, '')

function normalizeRelativePath(path: string): string {
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function isLocalOrigin(origin: string): boolean {
  try {
    const url = new URL(origin)
    return url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function sanitizeAppRelativePath(
  value: string | null | undefined,
  fallback: string = '/'
): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('://')) return fallback
  return value
}

export function buildRootAppUrl(path: string = '/'): string {
  return new URL(normalizeRelativePath(path), `${ROOT_APP_ORIGIN}/`).toString()
}

export function buildTenantAppUrl(slug: string, path: string = '/'): string {
  const relativePath = normalizeRelativePath(path)

  if (isLocalOrigin(ROOT_APP_ORIGIN)) {
    return new URL(`/tenant/app/${slug}${relativePath}`, `${ROOT_APP_ORIGIN}/`).toString()
  }

  return new URL(relativePath, `https://${slug}-app.${PWA_BASE_DOMAIN}`).toString()
}
