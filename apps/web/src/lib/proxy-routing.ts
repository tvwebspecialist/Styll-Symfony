import type { NextRequest } from 'next/server.js'

export type TenantType = 'landing' | 'app' | 'dashboard'
export type PublicTenantSurface = 'landing' | 'app'

const SKIP_SUBDOMAINS = new Set(['www', 'admin'])

export function parseTenant(subdomain: string): { type: TenantType; slug: string } | null {
  if (subdomain.endsWith('-dashboard')) {
    const slug = subdomain.slice(0, -'-dashboard'.length)
    if (!slug) return null
    return { type: 'dashboard', slug }
  }
  if (subdomain.endsWith('-app')) {
    const slug = subdomain.slice(0, -'-app'.length)
    if (!slug) return null
    return { type: 'app', slug }
  }
  return { type: 'landing', slug: subdomain }
}

export function getSubdomain(host: string, rootDomain: string): string | null {
  if (host.endsWith(`.${rootDomain}`)) {
    return host.slice(0, -(rootDomain.length + 1))
  }
  if (host.endsWith('.localhost:3000')) {
    return host.slice(0, -'.localhost:3000'.length)
  }
  return null
}

export function resolveTenantRewrite(request: NextRequest, rootDomain: string): URL | null {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) return null

  const subdomain = getSubdomain(host, rootDomain)
  if (subdomain && !SKIP_SUBDOMAINS.has(subdomain)) {
    const parsed = parseTenant(subdomain)
    if (parsed) {
      const url = request.nextUrl.clone()
      url.pathname = `/tenant/${parsed.type}/${parsed.slug}${pathname}`
      return url
    }
  }

  if (process.env.NODE_ENV === 'development' && host === 'localhost:3000') {
    const tenantSlug = request.nextUrl.searchParams.get('_tenant_slug')
    const tenantType = request.nextUrl.searchParams.get('_tenant_type') as TenantType | null
    if (tenantSlug && tenantType && ['landing', 'app', 'dashboard'].includes(tenantType)) {
      const url = request.nextUrl.clone()
      url.pathname = `/tenant/${tenantType}/${tenantSlug}${pathname}`
      url.searchParams.delete('_tenant_slug')
      url.searchParams.delete('_tenant_type')
      return url
    }
  }

  return null
}

export function getPublicTenantSurface(pathname: string): PublicTenantSurface | null {
  const match = pathname.match(/^\/tenant\/(landing|app)\/[^/]+/)
  return (match?.[1] as PublicTenantSurface | undefined) ?? null
}
