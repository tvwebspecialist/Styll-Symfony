import { headers } from 'next/headers'
import { ContextualNotFoundScreen } from '@/components/shared/ContextualNotFoundScreen'

export default async function NotFound() {
  const headerStore = await headers()
  const host = headerStore.get('host') ?? headerStore.get('x-forwarded-host')

  return <ContextualNotFoundScreen host={host} />
}
