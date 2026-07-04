const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'
const LOCALHOST_SUFFIX = '.localhost:3000'

export interface NotFoundScreenConfig {
  homeHref: string
  ctaLabel: string
  subtitle: string
}

type TenantSurface = 'landing' | 'app' | 'dashboard'

function rootConfig(): NotFoundScreenConfig {
  return {
    homeHref: '/',
    ctaLabel: 'Riportami a casa',
    subtitle: 'Torna a casa, barbiere.',
  }
}

function adminConfig(): NotFoundScreenConfig {
  return {
    homeHref: '/admin',
    ctaLabel: 'Torno in regia',
    subtitle: 'Torna al pannello admin.',
  }
}

function dashboardConfig(homeHref: string): NotFoundScreenConfig {
  return {
    homeHref,
    ctaLabel: 'Rientro in bottega',
    subtitle: 'Torna alla dashboard del tuo salone.',
  }
}

function appConfig(homeHref: string): NotFoundScreenConfig {
  return {
    homeHref,
    ctaLabel: "Rientro nell'app",
    subtitle: "Torna nell'app del tuo salone.",
  }
}

function landingConfig(homeHref: string): NotFoundScreenConfig {
  return {
    homeHref,
    ctaLabel: 'Torno dal barbiere',
    subtitle: 'Torna al sito del salone.',
  }
}

function firstValue(value: string | null | undefined): string | null {
  return value?.split(',')[0]?.trim() || null
}

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) return '/'

  const pathOnly = pathname.split('?')[0]?.split('#')[0] ?? '/'
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`
}

function getSubdomain(hostValue: string | null | undefined): string | null {
  const host = firstValue(hostValue)?.toLowerCase()
  if (!host) return null

  if (host === `admin.${ROOT_DOMAIN}` || host === `admin${LOCALHOST_SUFFIX}`) {
    return 'admin'
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    return host.slice(0, -(ROOT_DOMAIN.length + 1))
  }

  if (host.endsWith(LOCALHOST_SUFFIX)) {
    return host.slice(0, -LOCALHOST_SUFFIX.length)
  }

  return null
}

function getTenantSurfaceFromSubdomain(subdomain: string): TenantSurface | 'admin' | null {
  if (!subdomain || subdomain === 'www') return null
  if (subdomain === 'admin') return 'admin'
  if (subdomain.endsWith('-dashboard')) return 'dashboard'
  if (subdomain.endsWith('-app')) return 'app'
  return 'landing'
}

function getTenantSurfaceFromPath(pathname: string): { surface: TenantSurface; homeHref: string } | null {
  const match = pathname.match(/^\/tenant\/(landing|app|dashboard)\/([^/?#]+)/)
  if (!match) return null

  const surface = match[1] as TenantSurface
  const slug = decodeURIComponent(match[2])
  return {
    surface,
    homeHref: `/tenant/${surface}/${slug}`,
  }
}

export function resolveNotFoundScreenConfig(
  pathname: string | null | undefined,
  hostValue: string | null | undefined,
): NotFoundScreenConfig {
  const normalizedPath = normalizePath(pathname)
  const subdomain = getSubdomain(hostValue)
  const subdomainSurface = subdomain ? getTenantSurfaceFromSubdomain(subdomain) : null

  if (subdomainSurface === 'admin') return adminConfig()
  if (subdomainSurface === 'dashboard') return dashboardConfig('/')
  if (subdomainSurface === 'app') return appConfig('/')
  if (subdomainSurface === 'landing') return landingConfig('/')

  if (normalizedPath === '/admin' || normalizedPath.startsWith('/admin/')) {
    return adminConfig()
  }

  if (normalizedPath === '/dashboard' || normalizedPath.startsWith('/dashboard/')) {
    return dashboardConfig('/dashboard')
  }

  const tenantPath = getTenantSurfaceFromPath(normalizedPath)
  if (tenantPath?.surface === 'dashboard') return dashboardConfig(tenantPath.homeHref)
  if (tenantPath?.surface === 'app') return appConfig(tenantPath.homeHref)
  if (tenantPath?.surface === 'landing') return landingConfig(tenantPath.homeHref)

  return rootConfig()
}
