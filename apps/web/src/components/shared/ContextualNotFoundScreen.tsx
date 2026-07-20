'use client'

import { usePathname } from 'next/navigation'
import { resolveNotFoundScreenConfig } from '@/lib/not-found-context'
import { NotFoundScreen } from './NotFoundScreen'

interface ContextualNotFoundScreenProps {
  host: string | null
}

export function ContextualNotFoundScreen({
  host,
}: ContextualNotFoundScreenProps) {
  const pathname = usePathname()
  const config = resolveNotFoundScreenConfig(pathname, host)

  return <NotFoundScreen {...config} />
}
