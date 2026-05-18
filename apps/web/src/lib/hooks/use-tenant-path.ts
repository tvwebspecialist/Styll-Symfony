'use client'

import { usePathname } from 'next/navigation'

/**
 * Returns a function that generates the correct path for PWA navigation,
 * both in subdomain mode (production) and path mode (development).
 *
 * Subdomain:  barber-tomm-app.styll.it/prenota  → usePathname() = "/prenota"
 * Path mode:  localhost/tenant/app/barber-tomm   → usePathname() = "/tenant/app/barber-tomm"
 *
 * Usage:
 *   const tenantPath = useTenantPath(slug)
 *   tenantPath('/prenota')  → "/prenota" | "/tenant/app/slug/prenota"
 *   tenantPath('')          → "/"        | "/tenant/app/slug"
 */
export function useTenantPath(slug: string) {
  const pathname = usePathname()
  const isPathMode = pathname.startsWith('/tenant/app/')

  return (relativePath: string): string => {
    if (isPathMode) {
      return `/tenant/app/${slug}${relativePath}`
    }
    return relativePath || '/'
  }
}
