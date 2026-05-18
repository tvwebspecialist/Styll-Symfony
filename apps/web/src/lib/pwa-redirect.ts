import { headers } from 'next/headers'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

function onSubdomain(host: string): boolean {
  return host.endsWith(`.${ROOT_DOMAIN}`) || host.endsWith('.localhost:3000')
}

/**
 * Server-side equivalent of useTenantPath.
 * Reads the request Host header once and returns a path builder.
 *
 * Use in Server Components and Route Handlers where hooks are unavailable.
 *
 * Usage:
 *   const tp = await createTenantPaths(slug)
 *   redirect(tp('/accesso?mode=login'))
 *   <Link href={tp('/prenota')}>...</Link>
 */
export async function createTenantPaths(slug: string): Promise<(relativePath: string) => string> {
  const host = (await headers()).get('host') ?? ''
  const subdomain = onSubdomain(host)

  return (relativePath: string): string => {
    if (subdomain) {
      return relativePath || '/'
    }
    return `/tenant/app/${slug}${relativePath}`
  }
}
