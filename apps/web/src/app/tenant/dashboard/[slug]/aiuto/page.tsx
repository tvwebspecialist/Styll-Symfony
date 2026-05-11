import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'
import { AiutoClient } from '@/components/dashboard/aiuto/AiutoClient'

export const dynamic = 'force-dynamic'

export default async function AiutoPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  return <AiutoClient />
}
