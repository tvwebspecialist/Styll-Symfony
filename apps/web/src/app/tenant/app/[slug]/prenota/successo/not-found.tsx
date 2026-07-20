'use client'

import { usePathname } from 'next/navigation'
import { RestrictedSuccessPage } from './_components/RestrictedSuccessPage'

function buildTenantHomeHref(pathname: string): string {
  const match = pathname.match(/^\/tenant\/app\/([^/]+)/)
  return match ? `/tenant/app/${match[1]}` : '/'
}

export default function NotFound() {
  const pathname = usePathname()

  return <RestrictedSuccessPage homeHref={buildTenantHomeHref(pathname)} />
}
